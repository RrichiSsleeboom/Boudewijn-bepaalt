import { aliveOf } from './passengers.js';
import { addLog } from './log.js';
import { clamp } from './util.js';

// How the person is chosen. Each method has its own cost for the conscience
// and for the morale of the rest of the train.
export const METHODS = ['oldest', 'youngest', 'volunteer', 'lottery'];

export const METHOD_EFFECTS = {
  oldest: { conscience: 5, morale: 2 },
  youngest: { conscience: 12, morale: 6 },
  volunteer: { conscience: 3, morale: 1 },
  lottery: { conscience: 8, morale: 4 },
};

// Leaving someone behind at a station costs less than sacrificing them.
const LEFT_FACTOR = 0.5;

// Picks a victim for the method. rng is only used for the random methods.
export function pickVictim(passengers, method, rng) {
  const alive = aliveOf(passengers);
  if (alive.length === 0) return null;
  switch (method) {
    case 'oldest':
      return alive.reduce((a, b) => (b.age > a.age ? b : a));
    case 'youngest':
      return alive.reduce((a, b) => (b.age < a.age ? b : a));
    case 'volunteer': {
      const loyal = alive.filter(p => p.trait === 'loyal' && p.age >= 14);
      const hopeless = alive.filter(p => (p.trait === 'bitter' || p.trait === 'selfish') && p.age >= 14);
      const pool = loyal.length ? loyal : hopeless.length ? hopeless : alive.filter(p => p.age >= 14);
      return rng.pick(pool.length ? pool : alive);
    }
    case 'lottery':
    default:
      return rng.pick(alive);
  }
}

// Removes a passenger from the train. how is 'sacrificed' or 'left'.
// Returns the passenger, or null when nothing changed.
export function removePassenger(state, id, method, how = 'sacrificed') {
  const person = state.passengers.find(p => p.id === id);
  if (!person || person.status !== 'alive') return null;
  const factor = how === 'left' ? LEFT_FACTOR : 1;
  const fx = METHOD_EFFECTS[method] ?? METHOD_EFFECTS.lottery;

  person.status = how;
  state.stats[how === 'left' ? 'left' : 'sacrificed'] += 1;
  state.conscience = clamp(state.conscience - Math.round(fx.conscience * factor), 0, 100);
  for (const other of aliveOf(state.passengers)) {
    other.morale = clamp(other.morale - Math.round(fx.morale * factor), 0, 100);
  }

  const name = person.name;
  addLog(state, how === 'left'
    ? { nl: `${name} is achtergelaten bij het station.`, en: `${name} was left behind at the station.` }
    : { nl: `${name} is opgeofferd. De trein blijft stil achter.`, en: `${name} was sacrificed. The train falls silent.` });
  return person;
}
