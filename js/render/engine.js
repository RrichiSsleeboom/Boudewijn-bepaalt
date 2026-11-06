// Three.js renderer, loaded from a CDN at a fixed version (see THREE_VERSION).
// Only this file imports Three.js directly; the rest of the render layer gets it from here.
export const THREE_VERSION = '0.160.0';
const THREE_URL = `https://cdn.jsdelivr.net/npm/three@${THREE_VERSION}/build/three.module.js`;

export const THREE = await import(THREE_URL);

// True when the browser can make a WebGL context. Without it the game falls back to the 2D menus.
export function isWebGLAvailable() {
  try {
    const canvas = document.createElement('canvas');
    return !!(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

// A message in the middle of the 3D view, with the technical reason in the console.
function showError(container, err) {
  if (container.querySelector('.scene-error')) return;
  const box = document.createElement('div');
  box.className = 'scene-error';
  box.setAttribute('role', 'alert');
  box.textContent = `3D kon niet worden getekend (${err?.message ?? err}). Probeer de pagina opnieuw te laden of kies een lage beeldkwaliteit in het menu.`;
  container.appendChild(box);
}

// Creates a renderer in container with a scene, a camera and a render loop.
// Updaters run every frame with dt in seconds (capped at 50 ms, so a stalled tab does not jump).
export function createEngine(container, { fov = 70, quality = 'high' } = {}) {
  const renderer = new THREE.WebGLRenderer({
    antialias: quality === 'high',
    powerPreference: 'high-performance',
  });
  const maxPixelRatio = quality === 'high' ? 2 : 1;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxPixelRatio));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = quality === 'high';
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.className = 'scene-canvas';
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(fov, 1, 0.05, 400);
  camera.rotation.order = 'YXZ';

  const updaters = new Set();
  let running = false;
  let raf = 0;
  let last = 0;

  function resize() {
    const w = Math.max(1, container.clientWidth);
    const h = Math.max(1, container.clientHeight);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  const observer = new ResizeObserver(resize);
  observer.observe(container);
  resize();

  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    try {
      for (const fn of updaters) fn(dt);
      renderer.render(scene, camera);
    } catch (err) {
      // An error stops the loop. Show it, instead of leaving a black screen.
      running = false;
      console.error('3D-weergave gestopt:', err);
      showError(container, err);
      return;
    }
    if (running) raf = requestAnimationFrame(frame);
  }

  return {
    THREE,
    renderer,
    scene,
    camera,
    onUpdate(fn) {
      updaters.add(fn);
      return () => updaters.delete(fn);
    },
    start() {
      if (running) return;
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    },
    stop() {
      running = false;
      cancelAnimationFrame(raf);
    },
    // Frees the GPU memory and removes the canvas. Call this when a scene is left.
    dispose() {
      this.stop();
      observer.disconnect();
      scene.traverse(obj => {
        obj.geometry?.dispose();
        const mats = Array.isArray(obj.material) ? obj.material : obj.material ? [obj.material] : [];
        for (const m of mats) {
          m.map?.dispose();
          m.dispose();
        }
      });
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
