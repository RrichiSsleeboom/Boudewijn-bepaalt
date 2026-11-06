import { aliveOf, makePassenger, TRAIN_CAPACITY } from './passengers.js';
import { addLog } from './log.js';
import { advanceDay } from './day.js';
import { currentStation } from './travel.js';
import { withRng } from './rng.js';

export const CREW_MIN = 2;
export const CREW_MAX = 6;
export const CRATE_UNIT = 40; // one crate per 40 units of a resource
export const RESOURCES = ['food', 'fuel', 'ammo', 'medicine', 'materials', 'parts', 'pistol', 'bat'];

export const RESOURCE_LABELS = {
  food: { nl: 'voedsel', en: 'food' },
  fuel: { nl: 'brandstof', en: 'fuel' },
  ammo: { nl: 'munitie', en: 'ammo' },
  medicine: { nl: 'medicijnen', en: 'medicine' },
  materials: { nl: 'materiaal', en: 'materials' },
  parts: { nl: 'onderdelen', en: 'parts' },
  pistol: { nl: 'pistolen', en: 'pistols' },
  bat: { nl: 'knuppels', en: 'clubs' },
};

const HEART_DAMAGE_HEALTH = 6; // health lost per heart the crew lost
const MEDIC_HEAL = 8;

export const eligibleCrew = passengers => aliveOf(passengers).filter(p => p.age >= 14);

// Why scavenging is not possible right now, or { ok: true }.
export function canScavenge(state) {
  if (state.status !== 'playing') return { ok: false, reason: 'end' };
  if (!state.atStation) return { ok: false, reason: 'travelling' };
  if (state.pending) return { ok: false, reason: 'pending' };
  if ((state.looted ?? []).includes(currentStation(state).id)) return { ok: false, reason: 'looted' };
  if (eligibleCrew(state.passengers).length < CREW_MIN) return { ok: false, reason: 'crew' };
  return { ok: true };
}

// Suggested crew: people with a skill first, then the healthiest.
export function defaultCrew(passengers) {
  return eligibleCrew(passengers)
    .slice()
    .sort((a, b) => (b.skill !== 'none') - (a.skill !== 'none') || b.health - a.health)
    .slice(0, 3)
    .map(p => p.id);
}

// Soldiers in the crew give extra hearts (lives), and a crew of five or more gets one more.
export function maxHearts(crew) {
  const soldiers = crew.filter(p => p.skill === 'soldier').length;
  return 3 + Math.min(2, soldiers) + (crew.length >= 5 ? 1 : 0);
}

// Survivors hiding at a station: more people in the crew find more of them.
export function survivorsFor(crewSize) {
  return 1 + Math.floor(crewSize / 2);
}

// Splits the loot of a station into crates. Each crate holds one resource portion.
export function buildCrates(loot) {
  const crates = [];
  for (const key of RESOURCES) {
    const amount = loot[key] ?? 0;
    if (amount <= 0) continue;
    const n = Math.max(1, Math.ceil(amount / CRATE_UNIT));
    const each = Math.floor(amount / n);
    for (let i = 0; i < n; i++) {
      crates.push({ type: key, amount: i === n - 1 ? amount - each * (n - 1) : each });
    }
  }
  return crates;
}

export function describeLoot(collected, lang = 'nl') {
  const parts = RESOURCES
    .filter(key => (collected[key] ?? 0) > 0)
    .map(key => `${collected[key]} ${RESOURCE_LABELS[key][lang]}`);
  return parts.length ? parts.join(', ') : (lang === 'nl' ? 'niets' : 'nothing');
}

// Applies the result of a scavenge run. Takes one day.
// result: { collected, kills, crewIds, heartsLost, downed, rescued }
// rescued is the number of survivors found; they join the train while there is room.
export function finishScavenge(state, result) {
  const { collected, kills, crewIds, heartsLost, downed } = result;
  const station = currentStation(state);

  for (const key of RESOURCES) {
    state.stock[key] = (state.stock[key] ?? 0) + (collected[key] ?? 0);
  }
  state.stats.scavenges += 1;
  state.stats.zombiesKilled += kills;
  state.looted = [...(state.looted ?? []), station.id];

  const crew = state.passengers.filter(p => p.status === 'alive' && crewIds.includes(p.id));
  for (const p of crew) p.health -= heartsLost * HEART_DAMAGE_HEALTH;

  if (downed && crew.length) {
    const lowest = crew.reduce((a, b) => (b.health < a.health ? b : a));
    lowest.health = 0; // dies in the daily check
    addLog(state, { nl: `${lowest.name} is niet teruggekomen uit ${station.name.nl}.`, en: `${lowest.name} did not come back from ${station.name.en}.` });
  }

  const medicAlive = crew.some(p => p.skill === 'medic' && p.health > 0);
  if (medicAlive) {
    for (const p of crew) if (p.health > 0) p.health = Math.min(100, p.health + MEDIC_HEAL);
  }

  const joined = rescueSurvivors(state, result.rescued ?? 0);

  addLog(state, {
    nl: `Team terug uit ${station.name.nl}: ${describeLoot(collected, 'nl')}. ${kills} zombies uitgeschakeld.${joined ? ` ${joined} overlevende(n) meegenomen.` : ''}`,
    en: `Team back from ${station.name.en}: ${describeLoot(collected, 'en')}. ${kills} zombies taken down.${joined ? ` ${joined} survivor(s) brought along.` : ''}`,
  });

  advanceDay(state);
}

// New passengers join the train, as far as there is room. Returns how many joined.
export function rescueSurvivors(state, count) {
  const room = Math.max(0, TRAIN_CAPACITY - state.passengers.length);
  const n = Math.min(room, count);
  if (n <= 0) return 0;
  withRng(state, rng => {
    for (let i = 0; i < n; i++) {
      state.passengers.push(makePassenger(rng, state.passengers.length));
    }
  });
  return n;
}
