import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame } from '../js/core/state.js';
import { createRng } from '../js/core/rng.js';
import { pickVictim, removePassenger, METHOD_EFFECTS, METHODS } from '../js/core/sacrifice.js';
import { aliveOf } from '../js/core/passengers.js';

const fresh = () => newGame({ seed: 21 });

test('sacrifice: removes exactly one living passenger and records it', () => {
  const state = fresh();
  const victim = state.passengers[0];
  const before = aliveOf(state.passengers).length;
  const result = removePassenger(state, victim.id, 'lottery', 'sacrificed');
  assert.equal(result.id, victim.id);
  assert.equal(victim.status, 'sacrificed');
  assert.equal(aliveOf(state.passengers).length, before - 1);
  assert.equal(state.stats.sacrificed, 1);
});

test('sacrifice: a passenger cannot be removed twice', () => {
  const state = fresh();
  const id = state.passengers[1].id;
  removePassenger(state, id, 'oldest');
  assert.equal(removePassenger(state, id, 'oldest'), null);
  assert.equal(state.stats.sacrificed, 1);
});

test('sacrifice: the youngest costs more conscience than the oldest', () => {
  const a = fresh();
  const b = fresh();
  const youngest = pickVictim(a.passengers, 'youngest', createRng(1));
  const oldest = pickVictim(b.passengers, 'oldest', createRng(1));
  removePassenger(a, youngest.id, 'youngest');
  removePassenger(b, oldest.id, 'oldest');
  assert.ok(a.conscience < b.conscience);
  assert.equal(a.conscience, 60 - METHOD_EFFECTS.youngest.conscience);
});

test('sacrifice: leaving someone behind costs less than sacrificing them', () => {
  const a = fresh();
  const b = fresh();
  removePassenger(a, a.passengers[0].id, 'lottery', 'sacrificed');
  removePassenger(b, b.passengers[0].id, 'lottery', 'left');
  assert.ok(b.conscience > a.conscience);
  assert.equal(b.stats.left, 1);
  assert.equal(b.passengers[0].status, 'left');
});

test('sacrifice: the others lose morale', () => {
  const state = fresh();
  const before = state.passengers.slice(1).map(p => p.morale);
  removePassenger(state, state.passengers[0].id, 'youngest');
  const after = state.passengers.slice(1).map(p => p.morale);
  for (let i = 0; i < after.length; i++) {
    assert.ok(after[i] <= before[i]);
  }
});

test('victims: oldest and youngest pick the right ages', () => {
  const state = fresh();
  const oldest = pickVictim(state.passengers, 'oldest', createRng(1));
  const youngest = pickVictim(state.passengers, 'youngest', createRng(1));
  const ages = aliveOf(state.passengers).map(p => p.age);
  assert.equal(oldest.age, Math.max(...ages));
  assert.equal(youngest.age, Math.min(...ages));
});

test('victims: volunteer prefers loyal adults', () => {
  const state = fresh();
  state.passengers.forEach(p => { p.trait = 'optimistic'; p.age = 30; });
  state.passengers[7].trait = 'loyal';
  const victim = pickVictim(state.passengers, 'volunteer', createRng(4));
  assert.equal(victim.id, state.passengers[7].id);
});

test('victims: every method returns someone while people are alive', () => {
  const state = fresh();
  for (const method of METHODS) {
    const victim = pickVictim(state.passengers, method, createRng(9));
    assert.ok(victim, `${method} returned nobody`);
    assert.equal(victim.status, 'alive');
  }
});

test('victims: nobody left means nobody to pick', () => {
  const state = fresh();
  state.passengers.forEach(p => { p.status = 'dead'; });
  assert.equal(pickVictim(state.passengers, 'lottery', createRng(1)), null);
});
