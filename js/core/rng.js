// Seeded pseudo-random generator (mulberry32). The whole state is one integer,
// so it can be saved in the game state and every run stays reproducible.
export function createRng(seed = Date.now()) {
  let a = seed >>> 0;

  function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  return {
    next,
    get state() { return a; },
    int(min, max) { return min + Math.floor(next() * (max - min + 1)); },
    pick(list) { return list[Math.floor(next() * list.length)]; },
    chance(p) { return next() < p; },
    shuffle(list) {
      const out = list.slice();
      for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
      }
      return out;
    },
  };
}

// Runs fn with the RNG stored in state, then writes the advanced state back.
export function withRng(state, fn) {
  const rng = createRng(state.rngState);
  const result = fn(rng);
  state.rngState = rng.state;
  return result;
}
