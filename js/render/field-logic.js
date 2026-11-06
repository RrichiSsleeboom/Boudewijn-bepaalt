// Rules of the scavenge field, without any 3D code, so they can be tested in Node.
// Positions are plain { x, z } in metres. Y is ignored on the field.

export const FIELD = {
  DURATION: 60,            // seconds
  MAX_ZOMBIES: 9,
  SPAWN_EVERY: 1.3,        // seconds between spawns
  ZOMBIE_SPEED: [1.1, 1.9], // metres per second
  CONTACT_RANGE: 1.1,      // a zombie this close hurts the party
  MELEE_RANGE: 2.2,
  BAT_RANGE: 2.8,          // a bat reaches further than fists
  RESCUE_RANGE: 1.6,       // how close to a survivor you must be to bring them along
  MELEE_CONE: Math.cos(Math.PI / 3), // 120 degrees in front of the player
  MELEE_COOLDOWN: 0.5,
  SHOT_COOLDOWN: 0.3,
  SHOT_RANGE: 45,
  SHOT_HIT_RADIUS: 0.6,
  INVULNERABLE: 1.0,
  CRATE_RANGE: 1.3,
  PLAYER_RADIUS: 0.3,
  ZOMBIE_RADIUS: 0.3,
  ATTACK_AMMO: 2,
};

// Moves a zombie towards the target, sliding along colliders.
// colliders: [{ minX, maxX, minZ, maxZ }].
export function zombieStep(zombie, target, dt, colliders) {
  const vx = target.x - zombie.x;
  const vz = target.z - zombie.z;
  const len = Math.hypot(vx, vz) || 1;
  const step = zombie.speed * dt;
  const dx = (vx / len) * step;
  const dz = (vz / len) * step;
  if (!blockedAt(zombie.x + dx, zombie.z, FIELD.ZOMBIE_RADIUS, colliders)) zombie.x += dx;
  if (!blockedAt(zombie.x, zombie.z + dz, FIELD.ZOMBIE_RADIUS, colliders)) zombie.z += dz;
}

export function blockedAt(x, z, radius, colliders) {
  for (const c of colliders) {
    if (x + radius > c.minX && x - radius < c.maxX && z + radius > c.minZ && z - radius < c.maxZ) return true;
  }
  return false;
}

// Zombies in melee range and in front of the player. forward is a unit vector {x, z}.
export function meleeTargets(zombies, player, forward, range = FIELD.MELEE_RANGE) {
  return zombies.filter(z => {
    if (z.dead) return false;
    const dx = z.x - player.x;
    const dz = z.z - player.z;
    const dist = Math.hypot(dx, dz);
    if (dist > range || dist === 0) return dist === 0;
    return (dx * forward.x + dz * forward.z) / dist >= FIELD.MELEE_CONE;
  });
}

// The first live zombie hit by a shot, or null. origin and dir are on the floor plane.
export function shotTarget(zombies, origin, dir) {
  let best = null;
  let bestT = FIELD.SHOT_RANGE;
  for (const z of zombies) {
    if (z.dead) continue;
    const tx = z.x - origin.x;
    const tz = z.z - origin.z;
    const t = tx * dir.x + tz * dir.z; // distance along the shot
    if (t < 0 || t > bestT) continue;
    const perp = Math.abs(tx * dir.z - tz * dir.x); // distance from the shot line
    if (perp <= FIELD.SHOT_HIT_RADIUS + FIELD.ZOMBIE_RADIUS) {
      best = z;
      bestT = t;
    }
  }
  return best;
}

// Crates the player walks over. Returns the list of crates taken this step.
export function crateCollected(crates, player) {
  return crates.filter(c => !c.taken && Math.hypot(c.x - player.x, c.z - player.z) < FIELD.CRATE_RANGE);
}

export const ARENA = { minX: -30, maxX: 30, minZ: -30, maxZ: 30 };
export const START = { x: -26, z: 0 };

// The layout of a station's arena: buildings on a grid of blocks, wrecks in the streets,
// and crates on free floor. rand is a function that returns numbers in [0, 1).
// The same rand gives the same layout, so a station looks the same on every visit.
export function layoutArena(rand, crateCount) {
  const buildings = [];
  const colliders = [];
  const centres = [-22.5, -7.5, 7.5, 22.5];
  for (const cx of centres) {
    for (const cz of centres) {
      if (rand() < 0.25) continue; // empty lot
      const w = 6 + rand() * 3;
      const d = 6 + rand() * 3;
      const h = 6 + rand() * 8;
      const x = cx + (rand() - 0.5) * 2;
      const z = cz + (rand() - 0.5) * 2;
      buildings.push({ x, z, w, d, h });
      colliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 });
    }
  }

  const wrecks = [];
  for (let i = 0; i < 6; i++) {
    const horizontal = rand() < 0.5;
    const x = (rand() * 2 - 1) * 24;
    const z = (rand() * 2 - 1) * 24;
    const w = horizontal ? 4.5 : 2.2;
    const d = horizontal ? 2.2 : 4.5;
    if (overlapsAny(x, z, w, d, colliders) || nearStart(x, z)) continue;
    wrecks.push({ x, z, w, d, horizontal });
    colliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 });
  }

  const crates = [];
  let guard = 0;
  while (crates.length < crateCount && guard++ < 2000) {
    const x = ARENA.minX + 2 + rand() * (ARENA.maxX - ARENA.minX - 4);
    const z = ARENA.minZ + 2 + rand() * (ARENA.maxZ - ARENA.minZ - 4);
    if (blockedAt(x, z, 0.6, colliders) || nearStart(x, z)) continue;
    crates.push({ x, z });
  }

  return { bounds: ARENA, start: START, buildings, wrecks, crates, colliders };
}

function overlapsAny(x, z, w, d, colliders) {
  return colliders.some(c => x + w / 2 + 1 > c.minX && x - w / 2 - 1 < c.maxX &&
    z + d / 2 + 1 > c.minZ && z - d / 2 - 1 < c.maxZ);
}

function nearStart(x, z) {
  return Math.hypot(x - START.x, z - START.z) < 5;
}

// Survivors hiding in the arena. They wave; walking up to one brings them along.
export function placeSurvivors(rand, count, colliders) {
  const out = [];
  let guard = 0;
  while (out.length < count && guard++ < 2000) {
    const x = ARENA.minX + 3 + rand() * (ARENA.maxX - ARENA.minX - 6);
    const z = ARENA.minZ + 3 + rand() * (ARENA.maxZ - ARENA.minZ - 6);
    if (blockedAt(x, z, 0.8, colliders) || nearStart(x, z)) continue;
    out.push({ x, z, rescued: false });
  }
  return out;
}

// The weapons the crew carries, as hotbar slots. Fists are always there.
// The pistol needs ammo to fire; the bat and the fists need nothing.
export const WEAPON_SLOTS = ['fists', 'bat', 'pistol'];
export function weaponSlots(carried) {
  return [
    { id: 'fists', count: 1 },
    { id: 'bat', count: carried.bat ?? 0 },
    { id: 'pistol', count: carried.pistol ?? 0 },
  ];
}
export function slotUsable(slot, ammo) {
  if (slot.count <= 0) return false;
  if (slot.id === 'pistol') return ammo > 0;
  return true;
}

// How far behind the player the camera can sit (third person) without going into a wall.
// dir is the direction the player looks in; the camera sits on the opposite side.
// The whole line from the player to the camera must be free, not only the camera spot.
export function thirdPersonDistance(player, dir, colliders, maxDist = 2.8) {
  for (let d = maxDist; d >= 0.6; d -= 0.2) {
    let free = true;
    for (let s = 0.5; s <= d + 1e-9; s += 0.2) {
      if (blockedAt(player.x - dir.x * s, player.z - dir.z * s, 0.2, colliders)) {
        free = false;
        break;
      }
    }
    if (free) return d;
  }
  return 0.6;
}

// A random spawn point just outside the field edge, so zombies come in from all sides.
export function spawnPoint(bounds, rand) {
  const side = Math.floor(rand() * 4);
  const t = rand();
  if (side === 0) return { x: bounds.minX - 1, z: bounds.minZ + t * (bounds.maxZ - bounds.minZ) };
  if (side === 1) return { x: bounds.maxX + 1, z: bounds.minZ + t * (bounds.maxZ - bounds.minZ) };
  if (side === 2) return { x: bounds.minX + t * (bounds.maxX - bounds.minX), z: bounds.minZ - 1 };
  return { x: bounds.minX + t * (bounds.maxX - bounds.minX), z: bounds.maxZ + 1 };
}
