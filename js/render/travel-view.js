// The view out of the window while the train is on the road: rails, sleepers,
// poles, trees and hills slide past. The journey itself is already decided by
// core/travel.js; this is only the picture of it.
import { createEngine } from './engine.js';
import * as tex from './textures.js';
import { t } from '../i18n/index.js';

const LOOP = 160;       // objects wrap around after this many metres
const SPEED = 22;       // metres per second, as the train seems to move
const MIN_SECONDS = 3;
const MAX_SECONDS = 7;

// The length of the trip on screen: longer journeys take longer, within limits.
export function travelSeconds(days) {
  return Math.min(MAX_SECONDS, Math.max(MIN_SECONDS, 2.5 + days * 0.3));
}

// Runs the view in container. onDone is called once, when the time is up or the player skips.
export function runTravelView({ container, days, onDone, quality = 'high' }) {
  const engine = createEngine(container, { fov: 62, quality });
  const { THREE, scene, camera } = engine;
  const duration = travelSeconds(days);

  scene.background = new THREE.Color('#a9bcc4');
  scene.fog = new THREE.Fog('#a9bcc4', 30, 150);
  scene.add(new THREE.HemisphereLight('#eef4f8', '#4a5a3a', 1.3));
  const sun = new THREE.DirectionalLight('#fff3dc', 2.2);
  sun.position.set(-30, 50, 15);
  scene.add(sun);

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(600, 600),
    new THREE.MeshStandardMaterial({ map: tex.grass(THREE), roughness: 1 }),
  );
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  // Two rails, always in the same place.
  const railMat = new THREE.MeshStandardMaterial({ color: '#8a8d90', metalness: 0.7, roughness: 0.4 });
  for (const x of [-0.75, 0.75]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 600), railMat);
    rail.position.set(x, 0.06, 0);
    scene.add(rail);
  }

  // Everything that slides past. Each object keeps its own z and wraps at the edge.
  const movers = [];
  const tieMat = new THREE.MeshStandardMaterial({ color: '#4d3b2a', roughness: 1 });
  for (let z = -LOOP / 2; z < LOOP / 2; z += 1.6) {
    const tie = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.1, 0.24), tieMat);
    tie.position.set(0, 0.02, z);
    scene.add(tie);
    movers.push({ obj: tie, z });
  }
  const poleMat = new THREE.MeshStandardMaterial({ color: '#5a4a3a', roughness: 0.9 });
  for (let z = -LOOP / 2; z < LOOP / 2; z += 22) {
    for (const x of [-4.5, 4.5]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 7, 8), poleMat);
      pole.position.set(x, 3.5, z);
      pole.castShadow = true;
      scene.add(pole);
      movers.push({ obj: pole, z });
    }
  }
  const trunk = new THREE.MeshStandardMaterial({ color: '#4a3a2a', roughness: 1 });
  const leaves = [new THREE.MeshStandardMaterial({ color: '#4f6b34', roughness: 1 }), new THREE.MeshStandardMaterial({ color: '#6b7d3c', roughness: 1 })];
  let seed = 7;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  for (let i = 0; i < 46; i++) {
    const side = rand() < 0.5 ? -1 : 1;
    const x = side * (9 + rand() * 30);
    const z = -LOOP / 2 + rand() * LOOP;
    const h = 3 + rand() * 4;
    const tree = new THREE.Group();
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, h * 0.5, 6), trunk);
    stem.position.y = h * 0.25;
    stem.castShadow = true;
    const crown = new THREE.Mesh(new THREE.SphereGeometry(h * 0.35, 10, 8), leaves[i % 2]);
    crown.position.y = h * 0.6;
    crown.castShadow = true;
    tree.add(stem, crown);
    tree.position.set(x, 0, z);
    scene.add(tree);
    movers.push({ obj: tree, z });
  }

  // Hills on the horizon: they barely move, so they stay far away.
  const hillMat = new THREE.MeshStandardMaterial({ color: '#7d8a6a', roughness: 1 });
  for (const x of [-120, -60, 40, 110]) {
    const hill = new THREE.Mesh(new THREE.ConeGeometry(45 + rand() * 20, 22, 12), hillMat);
    hill.position.set(x, 0, -110);
    scene.add(hill);
  }

  camera.position.set(0, 1.6, 0);
  camera.rotation.set(-0.02, 0, 0, 'YXZ');

  let elapsed = 0;
  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    engine.stop();
    onDone?.();
  };

  const unsubscribe = engine.onUpdate(dt => {
    elapsed += dt;
    const move = SPEED * dt;
    for (const m of movers) {
      m.z += move;
      if (m.z > LOOP / 2) m.z -= LOOP;
      m.obj.position.z = m.z;
    }
    // A small sway of the carriage.
    camera.position.y = 1.6 + Math.sin(elapsed * 14) * 0.01;
    camera.rotation.z = Math.sin(elapsed * 3) * 0.004;
    if (elapsed >= duration) finish();
  });

  // The player can skip the trip.
  const skip = document.createElement('button');
  skip.type = 'button';
  skip.className = 'btn small walk-exit';
  skip.textContent = t('travel.skip');
  skip.addEventListener('click', finish);
  container.appendChild(skip);

  const label = document.createElement('div');
  label.className = 'travel-label';
  label.textContent = t('travel.label', { days });
  label.setAttribute('role', 'status');
  container.appendChild(label);

  engine.start();

  return {
    dispose() {
      unsubscribe();
      skip.remove();
      label.remove();
      engine.dispose();
    },
  };
}
