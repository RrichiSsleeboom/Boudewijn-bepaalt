import { withRng } from './rng.js';
import { aliveOf } from './passengers.js';
import { addLog } from './log.js';
import { clamp } from './util.js';
import { markDeaths } from './day.js';
import { EVENTS, EVENT_BY_ID } from '../data/events.js';

const STOCK_KEYS = ['food', 'fuel', 'ammo', 'medicine', 'materials', 'parts'];

// Applies one effect block. Uses the rng for the "one random passenger" effects.
export function applyEffect(state, effect, rng) {
  const alive = aliveOf(state.passengers);
  for (const [key, value] of Object.entries(effect)) {
    if (STOCK_KEYS.includes(key)) {
      state.stock[key] = Math.max(0, state.stock[key] + value);
    } else if (key === 'morale') {
      for (const p of alive) p.morale = clamp(p.morale + value, 0, 100);
    } else if (key === 'health') {
      for (const p of alive) p.health = clamp(p.health + value, 0, 100);
    } else if (key === 'oneHealth') {
      if (alive.length) {
        const p = rng.pick(alive);
        p.health = clamp(p.health + value, 0, 100);
      }
    } else if (key === 'conscience') {
      state.conscience = clamp(state.conscience + value, 0, 100);
    }
  }
}

// Picks a random event (used when the train is on the road).
export function pickEvent(rng) {
  return rng.pick(EVENTS);
}

// Resolves the open event with the chosen option. Returns the bilingual result text,
// or null when there is no open event or the choice does not exist.
export function resolveEvent(state, choiceIndex) {
  if (state.pending?.type !== 'event') return null;
  const event = EVENT_BY_ID[state.pending.id];
  const choice = event?.choices[choiceIndex];
  if (!choice) return null;

  const messages = [];
  withRng(state, rng => applyEffect(state, choice.effect, rng));
  messages.push(...markDeaths(state));

  state.pending = null;
  addLog(state, { nl: `${event.title.nl}: ${choice.label.nl}.`, en: `${event.title.en}: ${choice.label.en}.` });
  for (const m of messages) addLog(state, m);
  return choice.result;
}
