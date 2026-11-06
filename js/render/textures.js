// Procedural textures, drawn on canvas, so the game needs no image files.
// Every texture uses a fixed seed, so the look is the same on every visit.

function seeded(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function make(THREE, size, draw, { repeat = [1, 1], seed = 1, srgb = true } = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const g = canvas.getContext('2d');
  draw(g, size, seeded(seed));
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat[0], repeat[1]);
  tex.anisotropy = 4;
  if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Grit and speckles on a base colour.
function speckle(g, size, rand, base, spots, dark, light) {
  g.fillStyle = base;
  g.fillRect(0, 0, size, size);
  for (let i = 0; i < spots; i++) {
    g.fillStyle = rand() < 0.5 ? dark : light;
    g.globalAlpha = 0.15 + rand() * 0.25;
    const r = 1 + rand() * 3;
    g.fillRect(rand() * size, rand() * size, r, r);
  }
  g.globalAlpha = 1;
}

export function asphalt(THREE) {
  return make(THREE, 256, (g, s, r) => {
    speckle(g, s, r, '#3b3e41', 1800, '#1c1e20', '#6a6e72');
    g.strokeStyle = '#d8d2b8';
    g.lineWidth = 6;
    g.setLineDash([40, 30]);
    g.beginPath();
    g.moveTo(0, s / 2);
    g.lineTo(s, s / 2);
    g.stroke();
  }, { repeat: [6, 6], seed: 11 });
}

export function concrete(THREE) {
  return make(THREE, 256, (g, s, r) => {
    speckle(g, s, r, '#8f8c85', 1400, '#5d5b56', '#b9b5ab');
    g.strokeStyle = 'rgba(60,58,54,0.5)';
    g.lineWidth = 2;
    for (let i = 0; i <= s; i += s / 2) {
      g.beginPath();
      g.moveTo(i, 0);
      g.lineTo(i, s);
      g.moveTo(0, i);
      g.lineTo(s, i);
      g.stroke();
    }
  }, { repeat: [4, 4], seed: 23 });
}

export function grass(THREE) {
  return make(THREE, 256, (g, s, r) => {
    speckle(g, s, r, '#55603a', 2400, '#38401f', '#7d8a50');
  }, { repeat: [10, 10], seed: 31 });
}

// Brick facade with window rows. Used on the building walls.
export function facade(THREE, brick = '#7b4a36') {
  return make(THREE, 256, (g, s, r) => {
    speckle(g, s, r, brick, 900, '#4a2b20', '#a06a50');
    g.strokeStyle = 'rgba(40,25,18,0.35)';
    g.lineWidth = 1;
    for (let y = 0; y < s; y += 12) {
      g.beginPath();
      g.moveTo(0, y);
      g.lineTo(s, y);
      g.stroke();
    }
    // Windows: a 2 x 3 grid with a dark glass and a lighter frame.
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 2; col++) {
        const x = 40 + col * 100;
        const y = 30 + row * 80;
        g.fillStyle = '#d7d2c4';
        g.fillRect(x - 4, y - 4, 56, 66);
        g.fillStyle = r() < 0.3 ? '#2c3a44' : '#1d2a33';
        g.fillRect(x, y, 48, 58);
      }
    }
  }, { seed: 41 });
}

export function rust(THREE) {
  return make(THREE, 128, (g, s, r) => {
    speckle(g, s, r, '#5a4636', 900, '#2e231b', '#9b5b2c');
  }, { seed: 53 });
}

export function sky(THREE) {
  return make(THREE, 256, (g, s) => {
    const grad = g.createLinearGradient(0, 0, 0, s);
    grad.addColorStop(0, '#5f7f99');
    grad.addColorStop(0.6, '#c9b99a');
    grad.addColorStop(1, '#8b7f68');
    g.fillStyle = grad;
    g.fillRect(0, 0, s, s);
  }, { seed: 61 });
}
