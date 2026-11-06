// Builds the 3D look of a station arena: street, buildings, wrecks, crates and
// the evening light. The layout (where things stand) comes from field-logic.js.
import { ARENA } from './field-logic.js';
import * as tex from './textures.js';

const CRATE_COLOR = {
  food: '#6b8a4a',
  fuel: '#a8402e',
  ammo: '#6b5a3a',
  medicine: '#d9d9d0',
  materials: '#5f6f80',
  parts: '#c77a2c',
};

// Returns { crates: [{ mesh, index }], dispose() } and adds everything to the scene.
export function buildArena(engine, layout, { quality = 'high' } = {}) {
  const { THREE, scene } = engine;
  const shadows = quality === 'high';

  // Evening: warm sun from one side, cool sky light, fog to hide the edge of the arena.
  scene.background = new THREE.Color('#b8a98a');
  scene.fog = new THREE.Fog('#b8a98a', 35, 120);
  scene.add(new THREE.HemisphereLight('#dfe7f0', '#4a4438', 1.1));
  const sun = new THREE.DirectionalLight('#ffd7a0', 2.4);
  sun.position.set(-35, 45, 25);
  sun.castShadow = shadows;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -45, right: 45, top: 45, bottom: -45, near: 1, far: 150 });
  scene.add(sun);
  scene.add(sun.target);

  const asphaltTex = tex.asphalt(THREE);
  const concreteTex = tex.concrete(THREE);
  const facadeTex = tex.facade(THREE);
  const rustTex = tex.rust(THREE);
  const dark = new THREE.MeshStandardMaterial({ color: '#2c2f33', roughness: 0.6, metalness: 0.2 });
  const roof = new THREE.MeshStandardMaterial({ color: '#4d4a46', roughness: 0.9 });
  const rust = new THREE.MeshStandardMaterial({ map: rustTex, roughness: 0.7, metalness: 0.3 });
  const glass = new THREE.MeshStandardMaterial({ color: '#2a3640', roughness: 0.2, metalness: 0.6 });
  const crateMats = Object.fromEntries(
    Object.entries(CRATE_COLOR).map(([k, c]) => [k, new THREE.MeshStandardMaterial({ color: c, roughness: 0.7 })]),
  );

  // Ground: a big asphalt field, with a concrete strip where the party starts.
  const size = (ARENA.maxX - ARENA.minX) + 60;
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(size, size),
    new THREE.MeshStandardMaterial({ map: asphaltTex, roughness: 0.95 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const strip = new THREE.Mesh(
    new THREE.PlaneGeometry(8, 60),
    new THREE.MeshStandardMaterial({ map: concreteTex, roughness: 0.9 }),
  );
  strip.rotation.x = -Math.PI / 2;
  strip.position.set(layout.start.x - 2, 0.01, 0);
  strip.receiveShadow = true;
  scene.add(strip);

  const meshes = [];
  const add = mesh => {
    mesh.castShadow = shadows;
    mesh.receiveShadow = shadows;
    scene.add(mesh);
    meshes.push(mesh);
    return mesh;
  };

  const ownTextures = [];
  for (const b of layout.buildings) {
    // Each building gets its own repeat of the facade, so the windows keep a normal size.
    const facade = facadeTex.clone();
    facade.repeat.set(Math.max(1, b.w / 4), Math.max(1, b.h / 6));
    facade.needsUpdate = true;
    ownTextures.push(facade);
    const wall = new THREE.MeshStandardMaterial({ map: facade, roughness: 0.9 });
    // Side faces get the facade texture, top and bottom get the roof.
    const mats = [wall, wall, roof, roof, wall, wall];
    const body = add(new THREE.Mesh(new THREE.BoxGeometry(b.w, b.h, b.d), mats));
    body.position.set(b.x, b.h / 2, b.z);
    // A dark band at the bottom: the shop front.
    const band = add(new THREE.Mesh(new THREE.BoxGeometry(b.w + 0.05, 1.4, b.d + 0.05), glass));
    band.position.set(b.x, 0.7, b.z);
  }

  for (const w of layout.wrecks) {
    const body = add(new THREE.Mesh(new THREE.BoxGeometry(w.w, 1.0, w.d), rust));
    body.position.set(w.x, 0.5, w.z);
    const cabin = add(new THREE.Mesh(new THREE.BoxGeometry(w.w * 0.6, 0.6, w.d * 0.8), glass));
    cabin.position.set(w.x, 1.3, w.z);
    // Wheels sit just outside the body. A horizontal wreck has its length along x.
    const lx = w.horizontal ? 1.5 : 1.1;
    const lz = w.horizontal ? 1.1 : 1.5;
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const wheel = add(new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.33, 0.25, 12), dark));
      if (w.horizontal) wheel.rotation.x = Math.PI / 2;
      else wheel.rotation.z = Math.PI / 2;
      wheel.position.set(w.x + sx * lx, 0.33, w.z + sz * lz);
    }
  }

  // Crates: one box per portion of loot, coloured by resource.
  const crates = layout.crates.map((c, index) => {
    const mesh = add(new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.6, 0.7), crateMats.food));
    mesh.position.set(c.x, 0.3, c.z);
    return { mesh, index };
  });

  return {
    crates,
    colorCrate(index, type) {
      const crate = crates[index];
      if (crate) crate.mesh.material = crateMats[type] ?? crateMats.food;
    },
    dispose() {
      for (const m of meshes) scene.remove(m);
      scene.remove(ground);
      scene.remove(strip);
      scene.remove(sun);
      scene.remove(sun.target);
      for (const t of [asphaltTex, concreteTex, facadeTex, rustTex, ...ownTextures]) t.dispose();
    },
  };
}
