// A small view of the settlement at the station: a yard with a slot per module.
// Built modules stand in their slot, a module under construction is a scaffold.
import { createEngine } from './engine.js';
import { MODULE_IDS } from '../data/modules.js';
import { createRng } from '../core/rng.js';
import * as tex from './textures.js';

// Where each module stands, in the order of MODULE_IDS.
const SLOTS = [
  { x: -4, z: -3 }, { x: 0, z: -3 }, { x: 4, z: -3 },
  { x: -4, z: 3 }, { x: 0, z: 3 }, { x: 4, z: 3 },
];

// Shows the settlement. state.modules and state.building decide what stands.
// Returns { update(state), dispose() }.
export function runSettlementView({ container, state, quality = 'high', reduceMotion = false }) {
  const engine = createEngine(container, { fov: 50, quality });
  const { THREE, scene, camera } = engine;
  scene.background = new THREE.Color('#b8a98a');
  scene.fog = new THREE.Fog('#b8a98a', 30, 90);
  scene.add(new THREE.HemisphereLight('#eef2f5', '#4a4438', 1.2));
  const sun = new THREE.DirectionalLight('#ffd7a0', 2.2);
  sun.position.set(-20, 30, 15);
  scene.add(sun);

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(60, 60),
    new THREE.MeshStandardMaterial({ map: tex.concrete(THREE), roughness: 0.95 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const mats = {
    wood: new THREE.MeshStandardMaterial({ color: '#7a5b3a', roughness: 0.9 }),
    metal: new THREE.MeshStandardMaterial({ color: '#8a9096', roughness: 0.4, metalness: 0.6 }),
    glass: new THREE.MeshStandardMaterial({ color: '#9fd3c0', roughness: 0.2, transparent: true, opacity: 0.55 }),
    plant: new THREE.MeshStandardMaterial({ color: '#5f8a3a', roughness: 1 }),
    white: new THREE.MeshStandardMaterial({ color: '#e8e4da', roughness: 0.7 }),
    red: new THREE.MeshStandardMaterial({ color: '#c0392b', roughness: 0.7 }),
    scaffold: new THREE.MeshStandardMaterial({ color: '#c9a55a', roughness: 1, wireframe: true }),
  };

  const slotGroups = SLOTS.map((s, i) => {
    const group = new THREE.Group();
    group.position.set(s.x, 0, s.z);
    group.userData.module = MODULE_IDS[i];
    scene.add(group);
    return group;
  });
  // A few fixed props so the yard does not look empty: barrels and a fence.
  const rand = createRng(state.seed + 3).next;
  for (let i = 0; i < 8; i++) {
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.9, 10), mats.metal);
    barrel.position.set(-9 + rand() * 18, 0.45, -8 + rand() * 16);
    barrel.castShadow = true;
    scene.add(barrel);
  }

  function build(id) {
    const g = new THREE.Group();
    const add = (geo, mat, x, y, z) => {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x, y, z);
      m.castShadow = true;
      g.add(m);
      return m;
    };
    if (id === 'kas') {
      add(new THREE.BoxGeometry(2.6, 1.6, 1.8), mats.glass, 0, 0.8, 0);
      add(new THREE.BoxGeometry(2.2, 0.3, 1.4), mats.plant, 0, 0.2, 0);
    } else if (id === 'waterzuivering') {
      add(new THREE.CylinderGeometry(0.7, 0.7, 2.2, 14), mats.metal, 0, 1.1, 0);
      add(new THREE.BoxGeometry(1.2, 0.6, 1.2), mats.wood, 0, 0.3, 0);
    } else if (id === 'generator') {
      add(new THREE.BoxGeometry(1.8, 1.1, 1.1), mats.metal, 0, 0.55, 0);
      add(new THREE.CylinderGeometry(0.08, 0.08, 1.6, 8), mats.metal, 0.6, 1.4, -0.3);
    } else if (id === 'radio') {
      add(new THREE.BoxGeometry(1.2, 1.0, 1.0), mats.wood, 0, 0.5, 0);
      add(new THREE.CylinderGeometry(0.03, 0.03, 3.2, 6), mats.metal, 0, 2.1, 0);
    } else if (id === 'kliniek') {
      add(new THREE.BoxGeometry(2.4, 2.0, 2.0), mats.white, 0, 1.0, 0);
      add(new THREE.BoxGeometry(0.9, 0.2, 0.1), mats.red, 0, 1.6, 1.02);
      add(new THREE.BoxGeometry(0.2, 0.9, 0.1), mats.red, 0, 1.6, 1.02);
    } else if (id === 'school') {
      add(new THREE.BoxGeometry(2.8, 2.2, 1.8), mats.white, 0, 1.1, 0);
      add(new THREE.CylinderGeometry(0.04, 0.04, 2.6, 6), mats.metal, 1.2, 1.3, -0.6);
    }
    return g;
  }

  function scaffold() {
    const g = new THREE.Group();
    const m = new THREE.Mesh(new THREE.BoxGeometry(2, 1.6, 1.6), mats.scaffold);
    m.position.y = 0.8;
    g.add(m);
    return g;
  }

  function update(current) {
    slotGroups.forEach((group, i) => {
      const id = MODULE_IDS[i];
      while (group.children.length) group.remove(group.children[0]);
      if (current.modules.includes(id)) group.add(build(id));
      else if (current.building?.id === id) group.add(scaffold());
    });
  }
  update(state);

  // A slow orbit around the yard. It stops when the player asks for less motion.
  let angle = 0.6;
  const place = () => {
    camera.position.set(Math.cos(angle) * 16, 7, Math.sin(angle) * 16);
    camera.lookAt(0, 1.2, 0);
  };
  place();
  const unsubscribe = engine.onUpdate(dt => {
    if (reduceMotion) return;
    angle += dt * 0.08;
    place();
  });
  engine.start();

  return {
    update,
    dispose() {
      unsubscribe();
      engine.dispose();
    },
  };
}
