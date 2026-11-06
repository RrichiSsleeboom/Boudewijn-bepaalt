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

// True when the player asked the system for less motion. Camera orbits then stop.
export function prefersReducedMotion() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}
