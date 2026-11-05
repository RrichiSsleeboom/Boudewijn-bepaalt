import { aliveOf, isChild } from './passengers.js';
import { addLog } from './log.js';
import { round1 } from './util.js';

export const RATION_SAVING = 0.25;   // rationing eats 25% less
export const CRISIS_DAYS = 2;        // a hunger crisis starts below this many days of food
export const SNOOZE_DAYS = 2;        // "wait and see" hides the crisis for this many days

// Rations needed per day: an adult eats 1, a child 0.5.
export function dailyNeed(passengers, rationing = false) {
  const base = aliveOf(passengers).reduce((sum, p) => sum + (isChild(p) ? 0.5 : 1), 0);
  return round1(rationing ? base * (1 - RATION_SAVING) : base);
}

export function isHungerCrisis(state) {
  const need = dailyNeed(state.passengers, state.rationing);
  return state.stock.food < need * CRISIS_DAYS;
}

// Opens or closes a hunger crisis when the food is (or is no longer) low.
export function refreshCrisis(state) {
  if (state.pending?.type === 'hunger' && !isHungerCrisis(state)) {
    state.pending = null;
    addLog(state, {
      nl: 'De voorraad is weer op peil. De hongercrisis is voorbij.',
      en: 'The food stock is back at a safe level. The hunger crisis is over.',
    });
  }
}

export function setRationing(state, on) {
  state.rationing = on;
  addLog(state, on
    ? { nl: 'Rantsoenering ingesteld. Iedereen eet minder.', en: 'Rationing started. Everyone eats less.' }
    : { nl: 'Rantsoenering opgeheven.', en: 'Rationing has ended.' });
}

// The player chooses to wait: the crisis is hidden for a few days.
export function snoozeHunger(state) {
  state.pending = null;
  state.crisisSnoozeUntil = state.day + SNOOZE_DAYS;
  addLog(state, {
    nl: 'De trein wacht af. Honger kost gezondheid.',
    en: 'The train waits it out. Hunger costs health.',
  });
}
