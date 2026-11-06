import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame } from '../js/core/state.js';
import { createRng } from '../js/core/rng.js';
import { makePassenger, TRAIN_CAPACITY } from '../js/core/passengers.js';
import {
  CREW_MAX, maxHearts, survivorsFor, finishScavenge, rescueSurvivors, defaultCrew,
} from '../js/core/scavenge.js';
import { canBuild, startBuilding } from '../js/core/rebuild.js';
import { seatFor, WAGONS } from '../js/render/train-world.js';
import { placeSurvivors, weaponSlots, slotUsable, layoutArena, blockedAt } from '../js/render/field-logic.js';
import { ROUTE } from '../js/data/stations.js';

test('crew: up to six people can go out', () => {
  assert.equal(CREW_MAX, 6);
});

test('hearts: a crew of five or more gets one extra heart', () => {
  const four = [{ skill: 'none' }, { skill: 'none' }, { skill: 'none' }, { skill: 'none' }];
  const five = [...four, { skill: 'none' }];
  assert.equal(maxHearts(four), 3);
  assert.equal(maxHearts(five), 4);
});

test('survivors: a bigger crew finds more of them', () => {
  assert.equal(survivorsFor(2), 2);
  assert.equal(survivorsFor(6), 4);
  assert.ok(survivorsFor(6) > survivorsFor(2));
});

test('passengers: a new passenger gets the next id and is alive', () => {
  const p = makePassenger(createRng(3), 100);
  assert.equal(p.id, 'p101');
  assert.equal(p.status, 'alive');
});

test('rescue: survivors join the train and get the next ids', () => {
  const state = newGame({ seed: 9 });
  const before = state.passengers.length;
  const joined = rescueSurvivors(state, 3);
  assert.equal(joined, 3);
  assert.equal(state.passengers.length, before + 3);
  const ids = new Set(state.passengers.map(p => p.id));
  assert.equal(ids.size, state.passengers.length);
});

test('rescue: the train has room for at most its capacity', () => {
  const state = newGame({ seed: 9 });
  const rng = createRng(1);
  while (state.passengers.length < TRAIN_CAPACITY - 2) state.passengers.push(makePassenger(rng, state.passengers.length));
  assert.equal(rescueSurvivors(state, 10), 2);
  assert.equal(state.passengers.length, TRAIN_CAPACITY);
  assert.equal(rescueSurvivors(state, 5), 0);
});

test('finish: rescued survivors come along and the day passes', () => {
  const state = newGame({ seed: 12 });
  state.stock.food = 1000;
  const day = state.day;
  const crewIds = defaultCrew(state.passengers);
  const before = state.passengers.length;
  finishScavenge(state, { collected: {}, kills: 0, crewIds, heartsLost: 0, downed: false, rescued: 2 });
  assert.equal(state.passengers.length, before + 2);
  assert.equal(state.day, day + 1);
});

test('finish: found weapons go to the stock', () => {
  const state = newGame({ seed: 12 });
  state.stock.food = 1000;
  const pistols = state.stock.pistol;
  const bats = state.stock.bat;
  finishScavenge(state, { collected: { pistol: 2, bat: 1 }, kills: 0, crewIds: defaultCrew(state.passengers), heartsLost: 0, downed: false });
  assert.equal(state.stock.pistol, pistols + 2);
  assert.equal(state.stock.bat, bats + 1);
});

test('build: right after a search you can build on a station without a settlement', () => {
  const state = newGame({ seed: 14 });
  state.station = 1; // Kolenbrug is no settlement
  state.passengers[0].skill = 'farmer';
  state.passengers[0].age = 30;
  state.stock.materials = 100;
  assert.equal(canBuild(state, 'kas').reason, 'notSettlement');
  assert.equal(canBuild(state, 'kas', { anywhere: true }).ok, true);
  assert.equal(startBuilding(state, 'kas', { anywhere: true }).ok, true);
  assert.equal(state.building.id, 'kas');
});

test('train: six carriages hold 120 seats, all different', () => {
  assert.equal(WAGONS, 6);
  const keys = new Set();
  for (let i = 0; i < TRAIN_CAPACITY; i++) {
    const s = seatFor(i);
    keys.add(`${s.x},${s.z}`);
  }
  assert.equal(keys.size, TRAIN_CAPACITY);
});

test('hotbar: fists are always there, a pistol needs ammo to fire', () => {
  const slots = weaponSlots({ pistol: 1, bat: 0 });
  assert.equal(slots[0].id, 'fists');
  assert.equal(slotUsable(slots[0], 0), true);
  assert.equal(slotUsable(slots[1], 5), false); // no bat
  assert.equal(slotUsable(slots[2], 0), false); // pistol without ammo
  assert.equal(slotUsable(slots[2], 3), true);
});

test('survivors: placed inside the arena, away from buildings', () => {
  const layout = layoutArena(createRng(4).next, 8);
  const rand = createRng(8).next;
  const spots = placeSurvivors(rand, 4, layout.colliders);
  assert.equal(spots.length, 4);
  for (const s of spots) assert.equal(blockedAt(s.x, s.z, 0.8, layout.colliders), false);
});

test('route: the stations carry weapons as loot', () => {
  const pistols = ROUTE.reduce((sum, s) => sum + (s.loot.pistol ?? 0), 0);
  const bats = ROUTE.reduce((sum, s) => sum + (s.loot.bat ?? 0), 0);
  assert.ok(pistols > 0 && bats > 0);
});
