import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame } from '../js/core/state.js';
import { advanceDay } from '../js/core/day.js';
import { dailyNeed, snoozeHunger, RATION_SAVING, SNOOZE_DAYS } from '../js/core/food.js';
import { aliveOf, isChild } from '../js/core/passengers.js';
import { MODULES } from '../js/data/modules.js';

const fresh = (seed = 11) => newGame({ seed });

test('food: an adult eats 1 ration and a child 0.5', () => {
  const state = fresh();
  const expected = aliveOf(state.passengers).reduce((s, p) => s + (isChild(p) ? 0.5 : 1), 0);
  assert.equal(dailyNeed(state.passengers), expected);
});

test('food: rationing reduces the daily need by 25%', () => {
  const state = fresh();
  const full = dailyNeed(state.passengers, false);
  const reduced = dailyNeed(state.passengers, true);
  assert.ok(Math.abs(reduced - full * (1 - RATION_SAVING)) < 0.11, `${reduced} vs ${full}`);
});

test('day: advancing a day moves the counter on and uses food', () => {
  const state = fresh();
  const before = state.stock.food;
  const need = dailyNeed(state.passengers);
  advanceDay(state);
  assert.equal(state.day, 2);
  assert.ok(Math.abs(state.stock.food - (before - need)) < 0.11);
});

test('day: a hunger crisis starts when there is less than 2 days of food', () => {
  const state = fresh();
  state.stock.food = 5; // the train needs about 90 per day
  advanceDay(state);
  assert.deepEqual(state.pending, { type: 'hunger' });
});

test('day: no crisis while the stock is comfortable', () => {
  const state = fresh();
  state.stock.food = 1000;
  advanceDay(state);
  assert.equal(state.pending, null);
});

test('day: starving costs health, and people eventually die', () => {
  const state = fresh();
  state.stock.food = 0;
  state.pending = { type: 'hunger' };
  const alive0 = aliveOf(state.passengers).length;
  for (let i = 0; i < 6; i++) advanceDay(state);
  assert.ok(aliveOf(state.passengers).length < alive0, 'nobody died while starving');
  assert.ok(state.stats.died > 0);
});

test('crisis: waiting hides the crisis for a few days', () => {
  const state = fresh();
  state.stock.food = 5;
  advanceDay(state);
  assert.ok(state.pending);
  snoozeHunger(state);
  assert.equal(state.pending, null);
  const until = state.crisisSnoozeUntil;
  assert.equal(until, state.day + SNOOZE_DAYS);
  while (state.day < until) {
    state.stock.food = 5;
    advanceDay(state);
    assert.equal(state.pending, null, `crisis came back on day ${state.day}`);
  }
});

test('rationing: is switched off again once food is comfortable', () => {
  const state = fresh();
  state.rationing = true;
  state.stock.food = 10000;
  advanceDay(state);
  assert.equal(state.rationing, false);
});

test('modules: a finished kas adds food every day after it is built', () => {
  const state = fresh();
  state.modules.push('kas');
  state.stock.food = 100;
  const need = dailyNeed(state.passengers);
  advanceDay(state);
  const expected = 100 + MODULES.kas.effects.food - need;
  assert.ok(Math.abs(state.stock.food - expected) < 0.11, `${state.stock.food} vs ${expected}`);
});

test('modules: construction finishes after its days and unlocks radio', () => {
  const state = fresh();
  state.building = { id: 'radio', daysLeft: 1 };
  advanceDay(state);
  assert.equal(state.building, null);
  assert.ok(state.modules.includes('radio'));
  assert.equal(state.flags.radio, true);
});

test('day: advancing does nothing once the game has ended', () => {
  const state = fresh();
  state.status = 'ended';
  advanceDay(state);
  assert.equal(state.day, 1);
});
