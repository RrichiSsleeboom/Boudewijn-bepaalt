import { test } from 'node:test';
import assert from 'node:assert/strict';
import { seatFor, WAGONS, WAGON_LENGTH, TRAIN_BOUNDS } from '../js/render/train-world.js';

test('seats: 100 passengers get 100 different seats', () => {
  const keys = new Set();
  for (let i = 0; i < 100; i++) {
    const s = seatFor(i);
    keys.add(`${s.x},${s.z}`);
  }
  assert.equal(keys.size, 100);
});

test('seats: twenty seats per carriage, ten on each side', () => {
  for (let w = 0; w < WAGONS; w++) {
    const seats = [];
    for (let i = w * 20; i < (w + 1) * 20; i++) seats.push(seatFor(i));
    assert.equal(seats.filter(s => s.side < 0).length, 10);
    assert.equal(seats.filter(s => s.side > 0).length, 10);
    assert.ok(seats.every(s => s.wagon === w));
  }
});

test('seats: every seat lies inside the train bounds', () => {
  for (let i = 0; i < 100; i++) {
    const s = seatFor(i);
    assert.ok(s.z > TRAIN_BOUNDS.minZ && s.z < TRAIN_BOUNDS.maxZ, `seat ${i} outside the train`);
    assert.ok(Math.abs(s.x) > 0.4 && Math.abs(s.x) < 1.5, `seat ${i} not beside the aisle`);
  }
});

test('bounds: the walk area is the aisle, and fits the carriages', () => {
  assert.ok(TRAIN_BOUNDS.minX < 0 && TRAIN_BOUNDS.maxX > 0);
  assert.equal(TRAIN_BOUNDS.maxZ - TRAIN_BOUNDS.minZ, WAGONS * WAGON_LENGTH - 1);
});
