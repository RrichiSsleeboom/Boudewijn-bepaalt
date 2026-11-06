import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SENSITIVITY, PX_PER_CM, radiansPerPixel, getSensitivityKey, getSensitivity } from '../js/render/settings.js';

// Mouse movement in pixels for one full turn at a given sensitivity.
const pixelsPerTurn = cm => cm * PX_PER_CM;

test('sensitivity: a full turn is 360 degrees at every setting', () => {
  for (const [key, cm] of Object.entries(SENSITIVITY)) {
    const turn = radiansPerPixel(cm) * pixelsPerTurn(cm);
    assert.ok(Math.abs(turn - 2 * Math.PI) < 1e-9, `${key}: ${turn}`);
  }
});

test('sensitivity: faster settings need less mouse movement for a turn', () => {
  assert.ok(SENSITIVITY.veryhigh < SENSITIVITY.high);
  assert.ok(SENSITIVITY.high < SENSITIVITY.normal);
  assert.ok(SENSITIVITY.normal < SENSITIVITY.low);
  assert.ok(radiansPerPixel(SENSITIVITY.high) > radiansPerPixel(SENSITIVITY.normal));
});

test('sensitivity: the default is faster than before (a full turn is well under 75 cm)', () => {
  // The old setting took about 75 cm of mouse movement for one turn.
  const cm = pixelsPerTurn(SENSITIVITY.high) / PX_PER_CM;
  assert.ok(cm < 30, `default needs ${cm.toFixed(1)} cm per turn`);
});

test('sensitivity: without storage the default is used', () => {
  assert.equal(getSensitivityKey(), 'high');
  assert.equal(getSensitivity(), radiansPerPixel(SENSITIVITY.high));
});
