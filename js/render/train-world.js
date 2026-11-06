// The inside of the train: five carriages, each with twenty seats, and one
// passenger per seat. Passengers who are gone are hidden.
import { createPassenger, createMaterials } from './characters.js';
import { isAlive } from '../core/passengers.js';

export const WAGONS = 6;          // six carriages of twenty seats: room for 120 people
export const WAGON_LENGTH = 12;   // metres from one carriage centre to the next
// Where the player may walk: the aisle, and the length of the train.
export const TRAIN_BOUNDS = {
  minX: -1.5,
  maxX: 1.5,
  minZ: -(WAGONS * WAGON_LENGTH) / 2 + 0.5,
  maxZ: (WAGONS * WAGON_LENGTH) / 2 - 0.5,
};
const SEATS_PER_SIDE = 10;
const SEAT_X = 0.72;              // seat centre, measured from the middle of the aisle
const BENCH_IN = 0.45;            // inner edge of a bench
const BENCH_OUT = 1.0;            // outer edge of a bench
const HALF_WIDTH = 1.5;           // inside of the carriage walls

// Where a passenger sits. The index is the position in state.passengers (0..99).
export function seatFor(index) {
  const wagon = Math.floor(index / 20);
  const within = index % 20;
  const side = within < SEATS_PER_SIDE ? -1 : 1; // -1 left, 1 right
  const k = within % SEATS_PER_SIDE;
  const z = (wagon - (WAGONS - 1) / 2) * WAGON_LENGTH - 4.05 + k * 0.9;
  return { x: side * SEAT_X, z, side, wagon };
}

// Builds the train. Returns { colliders, spawn, figures, refresh, dispose }.
export function buildTrain(engine, passengers, { quality = 'high', lang = 'nl' } = {}) {
  const { THREE, scene } = engine;
  const shadows = quality === 'high';
  const mats = createMaterials(THREE);
  const meshes = [];
  const colliders = [];

  scene.background = new THREE.Color('#1b1d20');
  scene.fog = new THREE.Fog('#1b1d20', 25, 70);
  scene.add(new THREE.HemisphereLight('#f4e6c8', '#2a2620', 0.7));

  const paint = {
    floor: new THREE.MeshStandardMaterial({ color: '#4a4036', roughness: 0.85 }),
    wall: new THREE.MeshStandardMaterial({ color: '#8c8170', roughness: 0.8 }),
    ceiling: new THREE.MeshStandardMaterial({ color: '#d9d2c2', roughness: 0.9 }),
    seat: new THREE.MeshStandardMaterial({ color: '#2f4a5c', roughness: 0.9 }),
    glass: new THREE.MeshStandardMaterial({ color: '#3a4a55', roughness: 0.1, metalness: 0.4, transparent: true, opacity: 0.55 }),
    lamp: new THREE.MeshStandardMaterial({ color: '#fff4d6', emissive: '#ffd58a', emissiveIntensity: 1.6 }),
    metal: new THREE.MeshStandardMaterial({ color: '#5b5f63', roughness: 0.4, metalness: 0.6 }),
  };

  const add = (geometry, material, x, y, z) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    mesh.castShadow = shadows;
    mesh.receiveShadow = shadows;
    scene.add(mesh);
    meshes.push(mesh);
    return mesh;
  };
  const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
  const wallCollider = (x, z, w, d) => colliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 });

  const totalLength = WAGONS * WAGON_LENGTH;
  // One long floor and ceiling.
  add(box(HALF_WIDTH * 2, 0.1, totalLength), paint.floor, 0, -0.05, 0);
  add(box(HALF_WIDTH * 2, 0.1, totalLength), paint.ceiling, 0, 2.6, 0);

  for (let w = 0; w < WAGONS; w++) {
    const zc = (w - (WAGONS - 1) / 2) * WAGON_LENGTH;

    // Side walls with a row of windows, and a few lamps on the ceiling.
    for (const side of [-1, 1]) {
      add(box(0.1, 2.4, WAGON_LENGTH), paint.wall, side * HALF_WIDTH, 1.2, zc);
      wallCollider(side * HALF_WIDTH, zc, 0.1, WAGON_LENGTH);
      for (let k = 0; k < 4; k++) {
        const z = zc - 4.5 + k * 3;
        add(box(0.05, 0.9, 1.6), paint.glass, side * (HALF_WIDTH - 0.02), 1.6, z);
      }
    }
    // Ceiling tubes: horizontal, just under the ceiling, across the carriage.
    for (const z of [zc - 3, zc + 3]) {
      const tube = add(new THREE.CylinderGeometry(0.05, 0.05, 2.4, 8), paint.lamp, 0, 2.52, z);
      tube.rotation.z = Math.PI / 2;
    }

    // Two benches per side (under the windows), which are also colliders.
    for (const side of [-1, 1]) {
      const cx = side * (BENCH_IN + BENCH_OUT) / 2;
      add(box(BENCH_OUT - BENCH_IN, 0.5, WAGON_LENGTH - 2), paint.seat, cx, 0.45, zc);
      wallCollider(cx, zc, BENCH_OUT - BENCH_IN, WAGON_LENGTH - 2);
    }

    // Wall plates at the ends of the carriage, with a door opening in the middle.
    if (w < WAGONS - 1) {
      const zEnd = zc + WAGON_LENGTH / 2;
      // The door opening is 1.2 m wide and centred. Each plate spans from the opening to the wall.
      for (const side of [-1, 1]) {
        const cx = side * 1.05;
        add(box(0.9, 2.4, 0.1), paint.wall, cx, 1.2, zEnd);
        wallCollider(cx, zEnd, 0.9, 0.1);
      }
    }
  }

  // Frame details: a handrail along each window row.
  for (const side of [-1, 1]) {
    add(box(0.05, 0.05, totalLength - 2), paint.metal, side * (HALF_WIDTH - 0.1), 1.1, 0);
  }

  // Passengers, one per seat.
  const figures = passengers.map((p, index) => {
    const seat = seatFor(index);
    const figure = createPassenger(THREE, mats, index);
    figure.group.position.set(seat.x, -0.35, seat.z);
    figure.group.rotation.y = seat.side < 0 ? Math.PI / 2 : -Math.PI / 2;
    figure.parts.legL.rotation.x = -Math.PI / 2;
    figure.parts.legR.rotation.x = -Math.PI / 2;
    figure.parts.armL.rotation.x = -0.4;
    figure.parts.armR.rotation.x = -0.4;
    scene.add(figure.group);
    meshes.push(figure.group);
    return { id: p.id, model: figure, seat };
  });

  // Lights along the carriages. A few point lights are enough for the mood.
  const lightCount = quality === 'high' ? WAGONS : 2;
  for (let w = 0; w < lightCount; w++) {
    const zc = ((w * (WAGONS - 1)) / Math.max(1, lightCount - 1) - (WAGONS - 1) / 2) * WAGON_LENGTH;
    const light = new THREE.PointLight('#ffd58a', 6, 14, 1.4);
    light.position.set(0, 2.2, zc);
    scene.add(light);
    meshes.push(light);
  }

  function refresh(passengersNow) {
    passengersNow.forEach((p, index) => {
      const fig = figures[index];
      if (fig) fig.model.group.visible = isAlive(p);
    });
  }
  refresh(passengers);

  return {
    colliders,
    spawn: { x: 0, z: 0 },
    figures,
    seatFor,
    refresh,
    dispose() {
      for (const m of meshes) scene.remove(m);
      for (const mat of Object.values(paint)) mat.dispose();
    },
  };
}
