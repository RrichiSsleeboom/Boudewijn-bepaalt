import { ROUTE, FUEL_PER_DAY, HAVEN_INDEX } from '../data/stations.js';
import { aliveOf } from './passengers.js';
import { addLog } from './log.js';

// Deliberately has no imports from day.js or travel.js, so those modules can
// import this one without a cycle.

export const ENDING_IDS = ['haven', 'zaad', 'geweten', 'stille', 'verloren'];

// Chooses the ending for a train that reached the harbour.
export function endingForArrival(state) {
  const alive = aliveOf(state.passengers).length;
  const modules = state.modules;
  if (alive >= 50 && modules.length >= 4) return 'haven';
  if (modules.includes('kas') && modules.includes('school') && modules.length >= 2) return 'zaad';
  if (state.conscience >= 65 && alive >= 40) return 'geweten';
  return 'stille';
}

// The train cannot move on: no fuel, no way to make fuel, and nothing left to search here.
export function isStranded(state) {
  if (!state.atStation) return false;
  const stop = ROUTE[state.station];
  if (!stop || stop.haven) return false;
  const cost = stop.distance * FUEL_PER_DAY;
  const searched = (state.looted ?? []).includes(stop.id);
  return state.stock.fuel < cost && searched && !state.modules.includes('generator');
}

// Ends the game when one of the conditions is met. Safe to call often.
// Returns the ending id, or null while the game goes on.
export function checkEnding(state) {
  if (state.status === 'ended') return state.ending;

  if (aliveOf(state.passengers).length === 0 || isStranded(state)) {
    return finish(state, 'verloren');
  }
  if (state.atStation && state.station === HAVEN_INDEX) {
    return finish(state, endingForArrival(state));
  }
  return null;
}

function finish(state, id) {
  state.status = 'ended';
  state.ending = id;
  addLog(state, {
    nl: 'Het spel is voorbij.',
    en: 'The game is over.',
  });
  return id;
}
