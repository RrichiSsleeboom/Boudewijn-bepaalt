import { ROUTE, FUEL_PER_DAY } from '../data/stations.js';
import { withRng } from './rng.js';
import { aliveOf } from './passengers.js';
import { addLog } from './log.js';
import { advanceDay, markDeaths } from './day.js';
import { pickEvent } from './events.js';

export const EVENT_CHANCE = 0.5;     // chance of an event on each leg
const ATTACK_AMMO = 2;               // ammo needed to beat off a zombie attack
const ATTACK_KILLS = 3;              // zombies killed when the train defends itself
const UNDEFENDED_HEALTH = 20;        // health lost per person when there is no ammo
const UNDEFENDED_MORALE = 5;

export const currentStation = state => ROUTE[state.station];
export const nextStation = state => ROUTE[state.station + 1] ?? null;
export const fuelCost = state => (currentStation(state).distance ?? 0) * FUEL_PER_DAY;

// Returns { ok: true } or { ok: false, reason: 'pending' | 'fuel' | 'end' | 'travelling' }.
export function canDepart(state) {
  if (state.status !== 'playing') return { ok: false, reason: 'end' };
  if (!state.atStation) return { ok: false, reason: 'travelling' };
  if (state.pending) return { ok: false, reason: 'pending' };
  if (!nextStation(state)) return { ok: false, reason: 'end' };
  if (state.stock.fuel < fuelCost(state)) return { ok: false, reason: 'fuel' };
  return { ok: true };
}

// Drives the train to the next station. Each day passes on the way, which
// means food is used and crises can start. Zombie attacks and events happen
// on arrival. Returns { ok, reason?, arrived? }.
export function depart(state) {
  const check = canDepart(state);
  if (!check.ok) return check;

  const from = currentStation(state);
  const to = nextStation(state);
  state.stock.fuel -= fuelCost(state);
  state.atStation = false;
  addLog(state, { nl: `De trein vertrekt naar ${to.name.nl}.`, en: `The train leaves for ${to.name.en}.` });

  for (let day = 0; day < from.distance && state.status === 'playing'; day++) {
    advanceDay(state);
  }
  if (state.status !== 'playing') return { ok: true, arrived: null };

  withRng(state, rng => {
    if (rng.chance(to.danger)) attack(state, rng);
    if (!state.pending && rng.chance(EVENT_CHANCE)) {
      state.pending = { type: 'event', id: pickEvent(rng).id };
    }
  });
  for (const m of markDeaths(state)) addLog(state, m);

  state.station += 1;
  state.atStation = true;
  addLog(state, { nl: `De trein is aangekomen in ${to.name.nl}.`, en: `The train has arrived at ${to.name.en}.` });
  return { ok: true, arrived: to };
}

// A zombie attack on the train. Ammo beats it off; without ammo the nearest
// passengers pay for it.
function attack(state, rng) {
  if (state.stock.ammo >= ATTACK_AMMO) {
    state.stock.ammo -= ATTACK_AMMO;
    state.stats.zombiesKilled += ATTACK_KILLS;
    addLog(state, { nl: 'Zombies valt de trein aan. De wachters houden ze buiten.', en: 'Zombies attack the train. The guards keep them out.' });
    return;
  }
  const hit = rng.shuffle(aliveOf(state.passengers)).slice(0, 2);
  for (const p of hit) {
    p.health -= UNDEFENDED_HEALTH;
    p.morale -= UNDEFENDED_MORALE;
  }
  addLog(state, { nl: 'Zombies bereiken de wagons. Zonder munitie raken twee mensen gewond.', en: 'Zombies reach the carriages. Without ammo, two people are hurt.' });
}
