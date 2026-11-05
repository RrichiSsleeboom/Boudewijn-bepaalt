import { MODULES } from '../data/modules.js';

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
