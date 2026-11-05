import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRng } from '../js/core/rng.js';
import { generatePassengers, aliveOf } from '../js/core/passengers.js';
import { newGame } from '../js/core/state.js';
import { COUNTRIES, SKILLS } from '../js/data/names.js';

test('rng: same seed gives the same sequence', () => {
  const a = createRng(42);
  const b = createRng(42);
  for (let i = 0; i < 50; i++) assert.equal(a.next(), b.next());
});

test('rng: state can be restored and continues the same sequence', () => {
  const a = createRng(7);
  a.next(); a.next();
  const b = createRng(a.state);
  for (let i = 0; i < 20; i++) assert.equal(a.next(), b.next());
});

test('passengers: exactly 100 people with unique ids', () => {
  const passengers = generatePassengers(createRng(1), 100);
  assert.equal(passengers.length, 100);
  assert.equal(new Set(passengers.map(p => p.id)).size, 100);
});

test('passengers: the same seed gives the same train', () => {
  const a = generatePassengers(createRng(99), 100);
  const b = generatePassengers(createRng(99), 100);
  assert.deepEqual(a, b);
});

test('passengers: they come from many countries', () => {
  const passengers = generatePassengers(createRng(3), 100);
  const countries = new Set(passengers.map(p => p.country));
  assert.ok(countries.size >= 12, `only ${countries.size} countries`);
  for (const p of passengers) {
    assert.ok(COUNTRIES.some(c => c.code === p.country));
  }
});

test('passengers: every skill appears among the adults', () => {
  const passengers = generatePassengers(createRng(5), 100);
  const adultSkills = new Set(passengers.filter(p => p.age >= 14).map(p => p.skill));
  for (const skill of SKILLS.filter(s => s !== 'none')) {
    assert.ok(adultSkills.has(skill), `no adult with skill ${skill}`);
  }
});

test('passengers: stats are within range and everyone starts alive', () => {
  const passengers = generatePassengers(createRng(8), 100);
  for (const p of passengers) {
    assert.ok(p.health >= 70 && p.health <= 100);
    assert.ok(p.morale >= 45 && p.morale <= 80);
    assert.equal(p.status, 'alive');
  }
  assert.equal(aliveOf(passengers).length, 100);
});

test('newGame: a fresh game starts on day 1 with 100 alive passengers', () => {
  const state = newGame({ seed: 1234 });
  assert.equal(state.day, 1);
  assert.equal(state.status, 'playing');
  assert.equal(aliveOf(state.passengers).length, 100);
  assert.equal(state.conscience, 60);
});

test('newGame: the same seed gives the same starting game', () => {
  assert.deepEqual(newGame({ seed: 77 }), newGame({ seed: 77 }));
});
