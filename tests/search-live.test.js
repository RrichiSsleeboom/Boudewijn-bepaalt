import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame } from '../js/core/state.js';
import { finishScavenge, defaultCrew } from '../js/core/scavenge.js';
import { dailyNeed } from '../js/core/food.js';
import { thirdPersonDistance } from '../js/render/field-logic.js';
import { getView } from '../js/render/settings.js';

test('third person: the camera sits at full distance when nothing is in the way', () => {
  const d = thirdPersonDistance({ x: 0, z: 0 }, { x: 0, z: -1 }, [], 2.8);
  assert.equal(d, 2.8);
});

test('third person: a wall behind the player pulls the camera in', () => {
  // A wall 1.2 m behind the player (along +z, since the player looks along -z).
  const wall = [{ minX: -5, maxX: 5, minZ: 1.0, maxZ: 1.5 }];
  const d = thirdPersonDistance({ x: 0, z: 0 }, { x: 0, z: -1 }, wall, 2.8);
  assert.ok(d < 1.0, `distance ${d} should stay in front of the wall`);
  assert.ok(d >= 0.6);
});

test('search: loot already in the stock is not added twice', () => {
  const state = newGame({ seed: 77 });
  state.stock.food = 1000;
  const need = dailyNeed(state.passengers);
  finishScavenge(state, {
    collected: { food: 50 }, kills: 0, crewIds: defaultCrew(state.passengers),
    heartsLost: 0, downed: false, applyLoot: false,
  });
  // Only the day's food is used; the 50 food was already added while searching.
  assert.ok(Math.abs(state.stock.food - (1000 - need)) < 0.11, `food ${state.stock.food}`);
});

test('search: without the flag the loot goes into the stock (fallback)', () => {
  const state = newGame({ seed: 77 });
  state.stock.food = 1000;
  const need = dailyNeed(state.passengers);
  finishScavenge(state, {
    collected: { food: 50 }, kills: 0, crewIds: defaultCrew(state.passengers),
    heartsLost: 0, downed: false,
  });
  assert.ok(Math.abs(state.stock.food - (1000 + 50 - need)) < 0.11, `food ${state.stock.food}`);
});

test('view: first person is the default', () => {
  assert.equal(getView(), 'first');
});
