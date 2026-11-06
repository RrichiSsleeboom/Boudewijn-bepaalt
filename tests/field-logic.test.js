import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  FIELD, ARENA, START, zombieStep, blockedAt, meleeTargets, shotTarget,
  crateCollected, spawnPoint, layoutArena,
} from '../js/render/field-logic.js';
import { createRng } from '../js/core/rng.js';

test('zombie: walks towards the player', () => {
  const z = { x: 0, z: 0, speed: 1.5 };
  zombieStep(z, { x: 10, z: 0 }, 1, []);
  assert.ok(z.x > 1.4 && z.x < 1.6, `x=${z.x}`);
  assert.ok(Math.abs(z.z) < 1e-9);
});

test('zombie: a wall stops it instead of letting it pass through', () => {
  const wall = [{ minX: 2, maxX: 3, minZ: -5, maxZ: 5 }];
  const z = { x: 0, z: 0, speed: 1.5 };
  for (let i = 0; i < 200; i++) zombieStep(z, { x: 10, z: 0 }, 0.05, wall);
  assert.ok(z.x < 2 - FIELD.ZOMBIE_RADIUS + 0.01, `zombie went through the wall: x=${z.x}`);
});

test('collision: blockedAt checks the radius', () => {
  const box = [{ minX: 0, maxX: 1, minZ: 0, maxZ: 1 }];
  assert.equal(blockedAt(0.5, 0.5, 0.3, box), true);
  assert.equal(blockedAt(2, 2, 0.3, box), false);
  assert.equal(blockedAt(-0.2, 0.5, 0.3, box), true); // within the radius of the edge
});

test('melee: hits a zombie in front, within range', () => {
  const player = { x: 0, z: 0 };
  const forward = { x: 0, z: -1 };
  const front = { x: 0, z: -1.5, dead: false };
  const behind = { x: 0, z: 1.5, dead: false };
  const far = { x: 0, z: -5, dead: false };
  const hits = meleeTargets([front, behind, far], player, forward);
  assert.deepEqual(hits, [front]);
});

test('melee: ignores dead zombies', () => {
  const hits = meleeTargets([{ x: 0, z: -1, dead: true }], { x: 0, z: 0 }, { x: 0, z: -1 });
  assert.equal(hits.length, 0);
});

test('shot: hits the nearest zombie on the line of fire', () => {
  const origin = { x: 0, z: 0 };
  const dir = { x: 0, z: -1 };
  const near = { x: 0.1, z: -4, dead: false };
  const far = { x: 0, z: -12, dead: false };
  const off = { x: 3, z: -6, dead: false };
  assert.equal(shotTarget([far, off, near], origin, dir), near);
});

test('shot: misses when nothing is in the line of fire', () => {
  const target = shotTarget([{ x: 4, z: -6, dead: false }], { x: 0, z: 0 }, { x: 0, z: -1 });
  assert.equal(target, null);
});

test('shot: has a maximum range', () => {
  const far = { x: 0, z: -(FIELD.SHOT_RANGE + 5), dead: false };
  assert.equal(shotTarget([far], { x: 0, z: 0 }, { x: 0, z: -1 }), null);
});

test('crates: only the ones within reach are collected', () => {
  const crates = [{ x: 0.5, z: 0, taken: false }, { x: 5, z: 0, taken: false }];
  const taken = crateCollected(crates, { x: 0, z: 0 });
  assert.deepEqual(taken, [crates[0]]);
});

test('crates: already taken crates are not taken again', () => {
  const crates = [{ x: 0, z: 0, taken: true }];
  assert.equal(crateCollected(crates, { x: 0, z: 0 }).length, 0);
});

test('spawn: zombies appear just outside the arena', () => {
  const rand = createRng(5).next;
  for (let i = 0; i < 100; i++) {
    const p = spawnPoint(ARENA, rand);
    const outside = p.x <= ARENA.minX || p.x >= ARENA.maxX || p.z <= ARENA.minZ || p.z >= ARENA.maxZ;
    assert.ok(outside, `spawn inside arena: ${p.x}, ${p.z}`);
  }
});

test('layout: the same seed gives the same arena', () => {
  const a = layoutArena(createRng(42).next, 10);
  const b = layoutArena(createRng(42).next, 10);
  assert.deepEqual(a, b);
});

test('layout: every crate gets a place, and none is inside a building or wreck', () => {
  const layout = layoutArena(createRng(7).next, 10);
  assert.equal(layout.crates.length, 10);
  for (const c of layout.crates) {
    assert.equal(blockedAt(c.x, c.z, 0.6, layout.colliders), false, `crate in a collider at ${c.x}, ${c.z}`);
  }
});

test('layout: the start is free of buildings and wrecks', () => {
  for (let seed = 1; seed <= 20; seed++) {
    const layout = layoutArena(createRng(seed).next, 8);
    assert.equal(blockedAt(START.x, START.z, FIELD.PLAYER_RADIUS, layout.colliders), false, `seed ${seed}`);
  }
});

test('layout: buildings stay inside the arena', () => {
  const layout = layoutArena(createRng(9).next, 8);
  for (const b of layout.buildings) {
    assert.ok(b.x - b.w / 2 >= ARENA.minX && b.x + b.w / 2 <= ARENA.maxX, `building x out of bounds at ${b.x}`);
    assert.ok(b.z - b.d / 2 >= ARENA.minZ && b.z + b.d / 2 <= ARENA.maxZ, `building z out of bounds at ${b.z}`);
  }
});
