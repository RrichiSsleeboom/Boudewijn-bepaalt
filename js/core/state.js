import { createRng } from './rng.js';
import { generatePassengers } from './passengers.js';

export const SAVE_KEY = 'laatste-trein-save';
export const SAVE_VERSION = 1;

// The train eats about 90 rations per day at the start, so 800 lasts about nine
// days. The route needs about 2200 in total, so scavenging at the stations matters.
export const START_STOCK = {
  food: 800,    // rations
  fuel: 40,     // units
  materials: 10,
  ammo: 15,
  medicine: 4,
  parts: 4,
  pistol: 1,            // spare pistols the crew can take out
  bat: 1,               // baseball bats / clubs the crew can take out
};

// Creates a new game. The seed is optional, so tests can pass a fixed one.
export function newGame({ seed = Math.floor(Math.random() * 2 ** 31), lang = 'nl' } = {}) {
  const rng = createRng(seed);
  const passengers = generatePassengers(rng, 100);
  return {
    version: SAVE_VERSION,
    seed,
    rngState: rng.state,
    lang,
    day: 1,
    station: 0,          // index in the route (see data/stations.js in phase 3)
    atStation: true,     // false while the train is between stations
    passengers,
    stock: { ...START_STOCK },
    conscience: 60,      // 0..100, a hidden score that drops after every sacrifice
    modules: [],         // ids of built modules
    building: null,      // { id, daysLeft }
    looted: [],          // station ids that were already scavenged
    rationing: false,
    pending: null,       // open crisis, for example { type: 'hunger' }
    crisisSnoozeUntil: 0, // no new hunger crisis before this day
    flags: { radio: false },
    stats: { sacrificed: 0, left: 0, died: 0, scavenges: 0, zombiesKilled: 0 },
    log: [],
    status: 'playing',   // playing | ended
    ending: null,
  };
}

export function saveGame(state) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false; // private mode or full storage: the game still runs
  }
}

export function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const state = JSON.parse(raw);
    return state && state.version === SAVE_VERSION ? state : null;
  } catch {
    return null;
  }
}

export function hasSave() {
  return loadGame() !== null;
}

export function clearSave() {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    /* nothing to clear */
  }
}
