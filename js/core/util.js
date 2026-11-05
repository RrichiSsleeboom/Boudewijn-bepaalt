export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

// Rounds to one decimal, so rations like 0.5 for children stay exact.
export const round1 = value => Math.round(value * 10) / 10;
