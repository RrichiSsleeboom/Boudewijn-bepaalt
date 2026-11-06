// Phase 1 spike: checks that Three.js loads, the render loop runs, and the
// first-person controls move and turn the camera. Not used by the game itself.
import { createEngine, isWebGLAvailable } from './engine.js';
import { createFirstPerson } from './controls.js';

const stage = document.getElementById('stage');
const status = document.getElementById('status');

if (!isWebGLAvailable()) {
  status.textContent = 'no-webgl';
} else {
  const engine = createEngine(stage);
  const { THREE, scene } = engine;

  scene.background = new THREE.Color('#9fb5c4');
  scene.fog = new THREE.Fog('#9fb5c4', 25, 120);
  scene.add(new THREE.HemisphereLight('#ffffff', '#40453a', 1.2));
  const sun = new THREE.DirectionalLight('#fff1d6', 2);
  sun.position.set(20, 30, 10);
  scene.add(sun);

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(200, 200),
    new THREE.MeshStandardMaterial({ color: '#5a6148' }),
  );
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);

  const colliders = [];
  const wallMat = new THREE.MeshStandardMaterial({ color: '#7a5b44' });
  for (let i = 0; i < 6; i++) {
    const w = 2 + (i % 3);
    const d = 2 + ((i + 1) % 2) * 3;
    const x = -12 + i * 5;
    const z = -10 - (i % 2) * 4;
    const box = new THREE.Mesh(new THREE.BoxGeometry(w, 2.4, d), wallMat);
    box.position.set(x, 1.2, z);
    scene.add(box);
    colliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 });
  }

  const controls = createFirstPerson({
    engine,
    element: stage,
    touchUi: null,
    actions: {},
  });
  controls.colliders.push(...colliders);
  controls.setPosition(0, 6);
  controls.setLook(0, 0);

  let frames = 0;
  engine.onUpdate(() => { frames++; });
  engine.start();

  window.__spike = {
    engine,
    controls,
    frames: () => frames,
    position: () => ({ x: controls.position.x, z: controls.position.z }),
    look: () => ({ ...controls.look }),
  };
  status.textContent = 'ok';
}
