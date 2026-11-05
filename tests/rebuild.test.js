import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame } from '../js/core/state.js';
import { canBuild, startBuilding, moduleEffects } from '../js/core/rebuild.js';
import { advanceDay } from '../js/core/day.js';
import { MODULES, MODULE_IDS } from '../js/data/modules.js';
import { ROUTE } from '../js/data/stations.js';

// A game at Oostrand (a settlement) with one farmer and one engineer for sure.
function settled(seed = 61) {
  const state = newGame({ seed });
  state.stock.materials = 100;
  state.stock.parts = 100;
  state.stock.medicine = 100;
  state.stock.food = 100000;
  state.passengers[0].skill = 'farmer';
  state.passengers[0].age = 30;
  state.passengers[1].skill = 'engineer';
  state.passengers[1].age = 30;
  return state;
}

test('rebuild: a standing kas at the start is buildable', () => {
  const state = settled();
  assert.equal(canBuild(state, 'kas').ok, true);
});

test('rebuild: not possible away from a settlement', () => {
  const state = settled();
  state.station = 1; // Kolenbrug is not a settlement
  assert.equal(canBuild(state, 'kas').reason, 'notSettlement');
});

test('rebuild: not possible while travelling', () => {
  const state = settled();
  state.atStation = false;
  assert.equal(canBuild(state, 'kas').reason, 'travelling');
});

test('rebuild: needs a crew member with the right skill', () => {
  const state = settled();
  state.passengers.forEach(p => { if (p.skill === 'farmer') p.skill = 'none'; });
  assert.equal(canBuild(state, 'kas').reason, 'skill');
});

test('rebuild: needs the materials', () => {
  const state = settled();
  state.stock.materials = 0;
  assert.equal(canBuild(state, 'kas').reason, 'cost');
});

test('rebuild: a module that stands cannot be built again', () => {
  const state = settled();
  state.modules.push('kas');
  assert.equal(canBuild(state, 'kas').reason, 'built');
});

test('rebuild: only one module is built at a time', () => {
  const state = settled();
  assert.equal(startBuilding(state, 'kas').ok, true);
  assert.equal(canBuild(state, 'school').reason, 'busy');
});

test('rebuild: starting pays the cost and sets the build days', () => {
  const state = settled();
  const materials = state.stock.materials;
  startBuilding(state, 'kas');
  assert.equal(state.stock.materials, materials - MODULES.kas.cost.materials);
  assert.deepEqual(state.building, { id: 'kas', daysLeft: MODULES.kas.days });
});

test('rebuild: construction finishes after its days, even while travelling', () => {
  const state = settled();
  startBuilding(state, 'kas');
  for (let i = 0; i < MODULES.kas.days; i++) advanceDay(state);
  assert.equal(state.building, null);
  assert.ok(state.modules.includes('kas'));
});

test('rebuild: every module has a valid skill and a known cost key', () => {
  const skills = new Set(['medic', 'mechanic', 'engineer', 'farmer', 'cook', 'teacher', 'soldier', 'none']);
  const stockKeys = new Set(['food', 'fuel', 'ammo', 'medicine', 'materials', 'parts']);
  for (const id of MODULE_IDS) {
    const m = MODULES[id];
    assert.ok(skills.has(m.skill), `${id} has skill ${m.skill}`);
    for (const key of Object.keys(m.cost)) assert.ok(stockKeys.has(key), `${id} costs ${key}`);
    assert.ok(m.days >= 1);
  }
});

test('rebuild: module effects add up', () => {
  const total = moduleEffects(['kas', 'kas', 'generator']);
  assert.equal(total.food, MODULES.kas.effects.food * 2);
  assert.equal(total.fuel, MODULES.generator.effects.fuel);
});

test('rebuild: the settlements are on the route', () => {
  const settlements = ROUTE.filter(s => s.settlement);
  assert.ok(settlements.length >= 4);
});
