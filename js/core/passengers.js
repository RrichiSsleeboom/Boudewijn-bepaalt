import { COUNTRIES, JOBS, TRAITS } from '../data/names.js';

const WORK_JOBS = JOBS.filter(j => !j.child);
const CHILD_JOB = JOBS.find(j => j.child);

// Creates the passengers for a new game. The same rng state always gives the same train.
export function generatePassengers(rng, count = 100) {
  const passengers = [];
  for (let i = 0; i < count; i++) {
    const country = rng.pick(COUNTRIES);
    const isChild = rng.chance(0.15);
    const job = isChild ? CHILD_JOB : rng.pick(WORK_JOBS);
    passengers.push({
      id: `p${String(i + 1).padStart(3, '0')}`,
      name: `${rng.pick(country.first)} ${rng.pick(country.last)}`,
      country: country.code,
      age: isChild ? rng.int(3, 13) : rng.int(18, 75),
      job: job.id,
      skill: job.skill,
      health: rng.int(70, 100),
      morale: rng.int(45, 80),
      trait: rng.pick(TRAITS),
      status: 'alive', // alive | sacrificed | left | dead
    });
  }
  return passengers;
}

export const isAlive = p => p.status === 'alive';
export const aliveOf = passengers => passengers.filter(isAlive);
export const isChild = p => p.age < 14;
