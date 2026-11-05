import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame } from '../js/core/state.js';
import { ROUTE, HAVEN_INDEX, FUEL_PER_DAY } from '../js/data/stations.js';
import { EVENTS } from '../js/data/events.js';
import { canDepart, depart, fuelCost } from '../js/core/travel.js';
import { resolveEvent, applyEffect } from '../js/core/events.js';
import { createRng } from '../js/core/rng.js';

const KNOWN_EFFECTS = ['food', 'fuel', 'ammo', 'medicine', 'materials', 'parts', 'morale', 'health', 'oneHealth', 'conscience'];

// Plays the whole route, resolving events and keeping food and ammo high so the
// test checks travel, not survival.
function playRoute(state) {
  let guard = 0;
  while (state.status === 'playing' && state.station < HAVEN_INDEX && guard++ < 50) {
    if (state.pending?.type === 'event') resolveEvent(state, 0);
    state.stock.food = Math.max(state.stock.food, 100000);
    state.stock.ammo = Math.max(state.stock.ammo, 1000);
    const result = depart(state);
    assert.ok(result.ok, `departure failed: ${result.reason}`);
  }
}

test('route: the haven is the last stop and every stop has loot', () => {
  assert.equal(HAVEN_INDEX, ROUTE.length - 1);
  assert.equal(ROUTE.length, 10);
  for (const stop of ROUTE) {
    assert.ok(stop.loot.food > 0, `${stop.id} has no food`);
  }
});

test('route: the total journey is about 24 days', () => {
  const days = ROUTE.reduce((sum, s) => sum + s.distance, 0);
  assert.equal(days, 24);
});

test('travel: fuel cost is distance times FUEL_PER_DAY', () => {
  const state = newGame({ seed: 5 });
  assert.equal(fuelCost(state), ROUTE[0].distance * FUEL_PER_DAY);
});

test('travel: departing moves to the next station, uses fuel and days', () => {
  const state = newGame({ seed: 5 });
  state.stock.food = 100000;
  const fuelBefore = state.stock.fuel;
  const days = ROUTE[0].distance;
  const result = depart(state);
  assert.ok(result.ok);
  assert.equal(state.station, 1);
  assert.equal(state.atStation, true);
  assert.equal(state.stock.fuel, fuelBefore - ROUTE[0].distance * FUEL_PER_DAY);
  assert.equal(state.day, 1 + days);
});

test('travel: departing is blocked while an event or crisis is open', () => {
  const state = newGame({ seed: 5 });
  state.pending = { type: 'event', id: 'schuur' };
  assert.equal(canDepart(state).reason, 'pending');
  assert.equal(depart(state).ok, false);
  assert.equal(state.station, 0);
});

test('travel: departing is blocked without enough fuel', () => {
  const state = newGame({ seed: 5 });
  state.stock.fuel = 0;
  assert.equal(canDepart(state).reason, 'fuel');
  assert.equal(depart(state).ok, false);
});

test('travel: a whole route reaches the haven', () => {
  const state = newGame({ seed: 17 });
  state.stock.fuel = 10000;
  playRoute(state);
  assert.equal(state.station, HAVEN_INDEX);
  assert.equal(state.status, 'playing'); // the ending is set in a later step
});

test('travel: the same seed and the same choices give the same journey', () => {
  const run = () => {
    const state = newGame({ seed: 2024 });
    state.stock.fuel = 10000;
    playRoute(state);
    return JSON.stringify(state);
  };
  assert.equal(run(), run());
});

test('events: every event has two choices and only known effect keys', () => {
  const ids = new Set();
  for (const event of EVENTS) {
    assert.ok(!ids.has(event.id), `duplicate ${event.id}`);
    ids.add(event.id);
    assert.equal(event.choices.length, 2, `${event.id} needs two choices`);
    for (const choice of event.choices) {
      for (const key of Object.keys(choice.effect)) {
        assert.ok(KNOWN_EFFECTS.includes(key), `${event.id} uses unknown effect ${key}`);
      }
    }
  }
});

test('events: choosing an option applies its effect and clears the event', () => {
  const state = newGame({ seed: 8 });
  state.stock.food = 100;
  state.pending = { type: 'event', id: 'schuur' };
  const result = resolveEvent(state, 0);
  assert.ok(result, 'no result text');
  assert.equal(state.stock.food, 135);
  assert.equal(state.pending, null);
});

test('events: resolving without an open event does nothing', () => {
  const state = newGame({ seed: 8 });
  assert.equal(resolveEvent(state, 0), null);
});

test('events: stock never drops below zero', () => {
  const state = newGame({ seed: 8 });
  state.stock.medicine = 0;
  applyEffect(state, { medicine: -5 }, createRng(1));
  assert.equal(state.stock.medicine, 0);
});

test('events: morale effects stay within 0..100', () => {
  const state = newGame({ seed: 8 });
  applyEffect(state, { morale: 500 }, createRng(1));
  assert.ok(state.passengers.every(p => p.morale <= 100));
  applyEffect(state, { morale: -500 }, createRng(1));
  assert.ok(state.passengers.every(p => p.morale >= 0));
});
