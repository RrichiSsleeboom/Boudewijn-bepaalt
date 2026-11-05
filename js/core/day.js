import { withRng } from './rng.js';
import { aliveOf } from './passengers.js';
import { addLog } from './log.js';
import { clamp, round1 } from './util.js';
import { dailyNeed, isHungerCrisis, CRISIS_DAYS } from './food.js';
import { moduleEffects } from './rebuild.js';
import { MODULES } from '../data/modules.js';

const UNFED_HEALTH = 12;
const UNFED_MORALE = 6;
const RATION_MORALE = 2;
const RATION_END_DAYS = 5;

// Anyone at 0 health or lower dies. Returns bilingual messages.
export function markDeaths(state) {
  const messages = [];
  for (const p of aliveOf(state.passengers)) {
    if (p.health <= 0) {
      p.status = 'dead';
      state.stats.died += 1;
      messages.push({ nl: `${p.name} is overleden.`, en: `${p.name} has died.` });
    }
  }
  return messages;
}

// Moves the game one day on. Returns the bilingual messages of that day.
export function advanceDay(state) {
  if (state.status !== 'playing') return [];
  const messages = [];

  withRng(state, rng => {
    const fx = moduleEffects(state.modules);
    const need = dailyNeed(state.passengers, state.rationing);

    // 1. Food: production in, consumption out.
    let food = round1(state.stock.food + fx.food - need);
    if (food < 0) {
      const shortfall = Math.ceil(-food);
      food = 0;
      const hungry = rng.shuffle(aliveOf(state.passengers)).slice(0, shortfall);
      for (const p of hungry) {
        p.health -= UNFED_HEALTH;
        p.morale -= UNFED_MORALE;
      }
      messages.push({ nl: `${hungry.length} passagiers hebben honger.`, en: `${hungry.length} passengers are hungry.` });
    }
    state.stock.food = food;

    // 2. Health and morale: rationing and modules.
    state.stock.fuel = Math.max(0, state.stock.fuel + fx.fuel);
    for (const p of aliveOf(state.passengers)) {
      p.health = clamp(p.health + fx.health, 0, 100);
      p.morale = clamp(p.morale + fx.morale - (state.rationing ? RATION_MORALE : 0), 0, 100);
    }

    // 3. Deaths.
    messages.push(...markDeaths(state));

    // 4. Rationing ends once the food is comfortable again.
    if (state.rationing && state.stock.food > dailyNeed(state.passengers, false) * RATION_END_DAYS) {
      state.rationing = false;
      messages.push({ nl: 'De voorraad is ruim genoeg. Rantsoenering stopt.', en: 'There is enough food again. Rationing stops.' });
    }

    // 5. Construction in progress.
    if (state.building) {
      state.building.daysLeft -= 1;
      if (state.building.daysLeft <= 0) {
        const module = MODULES[state.building.id];
        state.modules.push(module.id);
        if (module.unlocks) state.flags[module.unlocks] = true;
        messages.push({ nl: `${module.name.nl} is klaar.`, en: `${module.name.en} is finished.` });
        state.building = null;
      }
    }

    // 6. A new hunger crisis when the food runs low.
    const crisisAllowed = state.day >= (state.crisisSnoozeUntil ?? 0);
    if (!state.pending && crisisAllowed && isHungerCrisis(state)) {
      state.pending = { type: 'hunger' };
      messages.push({
        nl: `Er is nog maar voor ${CRISIS_DAYS} dagen eten. Er moet iets gebeuren.`,
        en: `There is food for only ${CRISIS_DAYS} days. Something has to change.`,
      });
    }

    state.day += 1;
  });

  for (const text of messages) addLog(state, text);
  return messages;
}
