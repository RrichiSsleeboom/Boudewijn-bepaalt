import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame } from '../js/core/state.js';
import { checkEnding, endingForArrival, isStranded, ENDING_IDS } from '../js/core/endings.js';
import { HAVEN_INDEX, ROUTE } from '../js/data/stations.js';
import { ENDING_TEXT } from '../js/data/endings.js';
import { aliveOf } from '../js/core/passengers.js';

const fresh = (seed = 71) => newGame({ seed });

// Makes everyone who is not in keep leave the train, so the numbers are exact.
function keepAlive(state, n) {
  state.passengers.forEach((p, i) => { if (i >= n) p.status = 'dead'; });
}

test('ending: the harbour with enough people and modules is the Haven', () => {
  const state = fresh();
  state.station = HAVEN_INDEX;
  state.modules = ['kas', 'school', 'radio', 'waterzuivering'];
  assert.equal(checkEnding(state), 'haven');
  assert.equal(state.status, 'ended');
});

test('ending: a kas and a school at the harbour is the Seed', () => {
  const state = fresh();
  state.station = HAVEN_INDEX;
  keepAlive(state, 30);
  state.modules = ['kas', 'school'];
  assert.equal(endingForArrival(state), 'zaad');
});

test('ending: a clear conscience with many survivors is the Conscience', () => {
  const state = fresh();
  keepAlive(state, 45);
  state.conscience = 70;
  state.station = HAVEN_INDEX;
  assert.equal(endingForArrival(state), 'geweten');
});

test('ending: a harbour with few people and no building is the Silent Train', () => {
  const state = fresh();
  keepAlive(state, 10);
  state.conscience = 20;
  state.station = HAVEN_INDEX;
  assert.equal(endingForArrival(state), 'stille');
});

test('ending: nobody left is lost on the tracks', () => {
  const state = fresh();
  state.passengers.forEach(p => { p.status = 'dead'; });
  assert.equal(checkEnding(state), 'verloren');
});

test('ending: stranded without fuel, after searching the station, is lost', () => {
  const state = fresh();
  state.station = 1;
  state.atStation = true;
  state.stock.fuel = 0;
  state.looted = [ROUTE[1].id];
  assert.equal(isStranded(state), true);
  assert.equal(checkEnding(state), 'verloren');
});

test('ending: not stranded while the station can still be searched', () => {
  const state = fresh();
  state.station = 1;
  state.stock.fuel = 0;
  state.looted = [];
  assert.equal(isStranded(state), false);
  assert.equal(checkEnding(state), null);
});

test('ending: a generator keeps the train from being stranded', () => {
  const state = fresh();
  state.station = 1;
  state.stock.fuel = 0;
  state.looted = [ROUTE[1].id];
  state.modules = ['generator'];
  assert.equal(isStranded(state), false);
});

test('ending: travelling is never stranded', () => {
  const state = fresh();
  state.station = 1;
  state.atStation = false;
  state.stock.fuel = 0;
  state.looted = [ROUTE[1].id];
  assert.equal(isStranded(state), false);
});

test('ending: an ended game stays ended with the same ending', () => {
  const state = fresh();
  state.station = HAVEN_INDEX;
  const first = checkEnding(state);
  const second = checkEnding(state);
  assert.equal(first, second);
  assert.equal(state.ending, first);
});

test('ending: the game goes on in the middle of the route', () => {
  const state = fresh();
  assert.equal(checkEnding(state), null);
  assert.equal(state.status, 'playing');
});

test('ending: every ending has an epilogue in both languages', () => {
  for (const id of ENDING_IDS) {
    const text = ENDING_TEXT[id];
    assert.ok(text, `no text for ${id}`);
    assert.ok(text.title.nl && text.title.en, `${id} title`);
    assert.ok(text.text.nl && text.text.en, `${id} text`);
  }
});

test('ending: all five endings can be reached', () => {
  const reached = new Set();

  const lost = fresh();
  lost.passengers.forEach(p => { p.status = 'dead'; });
  reached.add(checkEnding(lost));

  const haven = fresh();
  haven.station = HAVEN_INDEX;
  haven.modules = ['kas', 'school', 'radio', 'waterzuivering'];
  reached.add(checkEnding(haven));

  const seed = fresh();
  seed.station = HAVEN_INDEX;
  keepAlive(seed, 30);
  seed.modules = ['kas', 'school'];
  reached.add(checkEnding(seed));

  const conscience = fresh();
  conscience.station = HAVEN_INDEX;
  keepAlive(conscience, 45);
  conscience.conscience = 70;
  reached.add(checkEnding(conscience));

  const silent = fresh();
  silent.station = HAVEN_INDEX;
  keepAlive(silent, 10);
  silent.conscience = 20;
  reached.add(checkEnding(silent));

  for (const id of ENDING_IDS) assert.ok(reached.has(id), `${id} not reached`);
  assert.equal(aliveOf(lost.passengers).length, 0);
});
