import { MODULES } from '../data/modules.js';
import { ROUTE } from '../data/stations.js';
import { addLog } from './log.js';
import { aliveOf } from './passengers.js';

// Uses ROUTE directly (not travel.js), so day.js and rebuild.js do not import each other in a cycle.
const here = state => ROUTE[state.station];

// Sum of the daily effects of all standing modules.
export function moduleEffects(modules) {
  const total = { food: 0, fuel: 0, health: 0, morale: 0 };
  for (const id of modules) {
    for (const [key, value] of Object.entries(MODULES[id]?.effects ?? {})) {
      total[key] = (total[key] ?? 0) + value;
    }
  }
  return total;
}

export const hasModule = (state, id) => state.modules.includes(id);

export const hasSkill = (state, skill) =>
  aliveOf(state.passengers).some(p => p.skill === skill && p.age >= 14);

// Why a module cannot be built now, or { ok: true }.
// anywhere: right after a search, the crew can build where they stand, even without a settlement.
export function canBuild(state, id, { anywhere = false } = {}) {
  const module = MODULES[id];
  if (!module) return { ok: false, reason: 'unknown' };
  if (state.status !== 'playing') return { ok: false, reason: 'end' };
  if (!state.atStation) return { ok: false, reason: 'travelling' };
  if (state.pending) return { ok: false, reason: 'pending' };
  if (!anywhere && !here(state).settlement) return { ok: false, reason: 'notSettlement' };
  if (hasModule(state, id)) return { ok: false, reason: 'built' };
  if (state.building) return { ok: false, reason: 'busy' };
  if (!hasSkill(state, module.skill)) return { ok: false, reason: 'skill' };
  for (const [key, amount] of Object.entries(module.cost)) {
    if ((state.stock[key] ?? 0) < amount) return { ok: false, reason: 'cost' };
  }
  return { ok: true };
}

// Pays the cost and starts construction. It finishes after module.days days,
// also when the train has moved on.
export function startBuilding(state, id, opts = {}) {
  const check = canBuild(state, id, opts);
  if (!check.ok) return check;
  const module = MODULES[id];
  for (const [key, amount] of Object.entries(module.cost)) state.stock[key] -= amount;
  state.building = { id, daysLeft: module.days };
  addLog(state, {
    nl: `Bouw gestart: ${module.name.nl} in ${here(state).name.nl}.`,
    en: `Construction started: ${module.name.en} at ${here(state).name.en}.`,
  });
  return { ok: true };
}
