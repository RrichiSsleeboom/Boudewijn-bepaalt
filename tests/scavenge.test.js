import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame } from '../js/core/state.js';
import { ROUTE } from '../js/data/stations.js';
import { canScavenge, defaultCrew, maxHearts, buildCrates, finishScavenge, eligibleCrew, describeLoot, RESOURCES, CREW_MIN } from '../js/core/scavenge.js';
import { depart } from '../js/core/travel.js';

const fresh = (seed = 31) => newGame({ seed });

test('scavenge: allowed at a station with a crew and nothing pending', () => {
  const state = fresh();
  assert.deepEqual(canScavenge(state), { ok: true });
});

test('scavenge: not allowed while the train is travelling', () => {
  const state = fresh();
  state.atStation = false;
  assert.equal(canScavenge(state).reason, 'travelling');
});

test('scavenge: not allowed with an open event or crisis', () => {
  const state = fresh();
  state.pending = { type: 'event', id: 'schuur' };
  assert.equal(canScavenge(state).reason, 'pending');
});

test('scavenge: a station can only be searched once', () => {
  const state = fresh();
  state.stock.food = 100000;
  finishScavenge(state, { collected: {}, kills: 0, crewIds: defaultCrew(state.passengers), heartsLost: 0, downed: false });
  assert.equal(canScavenge(state).reason, 'looted');
});

test('scavenge: not allowed when too few people are left', () => {
  const state = fresh();
  state.passengers.slice(0, 100 - CREW_MIN + 1).forEach(p => { p.status = 'sacrificed'; });
  assert.equal(canScavenge(state).reason, 'crew');
});

test('scavenge: the default crew is between 2 and 4 living adults', () => {
  const state = fresh();
  const crew = defaultCrew(state.passengers);
  assert.ok(crew.length >= CREW_MIN && crew.length <= 4);
  for (const id of crew) {
    const p = state.passengers.find(x => x.id === id);
    assert.equal(p.status, 'alive');
    assert.ok(p.age >= 14);
  }
});

test('scavenge: soldiers add extra hearts, up to two', () => {
  const soldier = { skill: 'soldier' };
  assert.equal(maxHearts([]), 3);
  assert.equal(maxHearts([soldier]), 4);
  assert.equal(maxHearts([soldier, soldier, soldier, soldier]), 5);
});

test('crates: the crates add up to exactly the station loot', () => {
  for (const stop of ROUTE) {
    const crates = buildCrates(stop.loot);
    for (const key of RESOURCES) {
      const expected = stop.loot[key] ?? 0;
      const sum = crates.filter(c => c.type === key).reduce((s, c) => s + c.amount, 0);
      assert.equal(sum, expected, `${stop.id} ${key}`);
    }
    assert.ok(crates.every(c => c.amount > 0));
  }
});

test('finish: loot goes to the stock and the day passes', () => {
  const state = fresh();
  state.stock.food = 1000;
  const day = state.day;
  const crewIds = defaultCrew(state.passengers);
  finishScavenge(state, { collected: { food: 50, ammo: 3 }, kills: 4, crewIds, heartsLost: 0, downed: false });
  assert.equal(state.stock.ammo, 15 + 3);
  assert.ok(state.stock.food < 1000 + 50); // 50 added, one day of food used
  assert.equal(state.day, day + 1);
  assert.equal(state.stats.scavenges, 1);
  assert.equal(state.stats.zombiesKilled, 4);
  assert.ok(state.looted.includes(ROUTE[0].id));
});

test('finish: crew lose health for each heart lost', () => {
  const state = fresh();
  state.stock.food = 1000;
  const crewIds = [state.passengers[0].id, state.passengers[1].id];
  // No medic here, so nobody heals the team on the way back.
  for (const id of crewIds) {
    const p = state.passengers.find(x => x.id === id);
    p.skill = 'none';
    p.age = 30;
    p.health = 90;
  }
  finishScavenge(state, { collected: {}, kills: 0, crewIds, heartsLost: 2, downed: false });
  for (const id of crewIds) {
    assert.equal(state.passengers.find(x => x.id === id).health, 90 - 12);
  }
});

test('finish: when the party is downed, the weakest crew member dies', () => {
  const state = fresh();
  state.stock.food = 1000;
  const crewIds = defaultCrew(state.passengers);
  const crew = state.passengers.filter(p => crewIds.includes(p.id));
  crew.forEach((p, i) => { p.health = 90 - i * 10; });
  const weakest = crew.reduce((a, b) => (b.health < a.health ? b : a));
  finishScavenge(state, { collected: {}, kills: 0, crewIds, heartsLost: 3, downed: true });
  assert.equal(weakest.status, 'dead');
  assert.equal(state.stats.died >= 1, true);
});

test('finish: a medic in the crew heals the others a little', () => {
  const state = fresh();
  state.stock.food = 1000;
  const crewIds = [state.passengers[0].id, state.passengers[1].id];
  state.passengers[0].skill = 'medic';
  state.passengers[0].age = 30;
  state.passengers[1].age = 30;
  state.passengers[0].health = 80;
  state.passengers[1].health = 50;
  finishScavenge(state, { collected: {}, kills: 0, crewIds, heartsLost: 0, downed: false });
  assert.ok(state.passengers[1].health > 50);
});

test('describe: the loot text lists only what was found', () => {
  assert.equal(describeLoot({ food: 40, ammo: 2 }, 'nl'), '40 voedsel, 2 munitie');
  assert.equal(describeLoot({}, 'en'), 'nothing');
});

test('eligible crew: children cannot go out', () => {
  const state = fresh();
  const crew = eligibleCrew(state.passengers);
  assert.ok(crew.every(p => p.age >= 14));
});

test('route: a full journey with scavenging keeps the day count consistent', () => {
  const state = fresh(55);
  state.stock.fuel = 10000;
  let guard = 0;
  while (state.station < ROUTE.length - 1 && state.status === 'playing' && guard++ < 50) {
    if (state.pending?.type === 'event') state.pending = null;
    state.stock.food = Math.max(state.stock.food, 100000);
    assert.ok(depart(state).ok);
  }
  assert.equal(state.station, ROUTE.length - 1);
  assert.equal(state.day, 1 + ROUTE.reduce((s, r) => s + r.distance, 0));
});
