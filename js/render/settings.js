// Display settings for the 3D view. Stored per browser, like the language.
const QUALITY_KEY = 'laatste-trein-quality';

// 'high' uses shadows and anti-aliasing. 'low' is for older phones.
export function getQuality() {
  try {
    return localStorage.getItem(QUALITY_KEY) === 'low' ? 'low' : 'high';
  } catch {
    return 'high';
  }
}

export function setQuality(value) {
  try {
    localStorage.setItem(QUALITY_KEY, value === 'low' ? 'low' : 'high');
  } catch {
    /* no storage: the default stays */
  }
}

const SENSITIVITY_KEY = 'laatste-trein-sensitivity';

// Sensitivity is given the way FPS players think about it: centimetres of mouse
// movement for one full turn (360 degrees). Fewer centimetres means faster turning.
// Browsers report mouse movement in CSS pixels, and 96 CSS pixels make one inch.
export const PX_PER_CM = 96 / 2.54;
export const SENSITIVITY = {
  low: 40,      // slow, precise
  normal: 30,
  high: 22,     // the default
  veryhigh: 14, // fast turns
};
const DEFAULT_SENSITIVITY = 'high';

// 'low', 'normal', 'high' or 'veryhigh'. The default is 'high'.
export function getSensitivityKey() {
  try {
    const key = localStorage.getItem(SENSITIVITY_KEY);
    return SENSITIVITY[key] !== undefined ? key : DEFAULT_SENSITIVITY;
  } catch {
    return DEFAULT_SENSITIVITY;
  }
}

// Radians of turn per CSS pixel of mouse movement, for the chosen sensitivity.
export function radiansPerPixel(cmPer360) {
  return (2 * Math.PI) / (cmPer360 * PX_PER_CM);
}

export function getSensitivity() {
  return radiansPerPixel(SENSITIVITY[getSensitivityKey()]);
}

export function setSensitivity(key) {
  try {
    if (SENSITIVITY[key] !== undefined) localStorage.setItem(SENSITIVITY_KEY, key);
  } catch {
    /* no storage: the default stays */
  }
}

// True when the player asked the system for less motion. Camera orbits then stop.
export function prefersReducedMotion() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}
