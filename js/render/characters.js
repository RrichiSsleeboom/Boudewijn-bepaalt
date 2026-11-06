// Low-poly people: zombies on the field and passengers in the train.
// Each figure is a Group with pivots at the shoulders and hips, so arms and
// legs can swing when the figure walks.

const SKIN = ['#c9a88a', '#8d6a4f', '#e0bd9b', '#6e4a36', '#b98f6d'];

export function createMaterials(THREE) {
  return {
    zombieSkin: new THREE.MeshStandardMaterial({ color: '#6f7d5c', roughness: 0.9 }),
    zombieCloth: new THREE.MeshStandardMaterial({ color: '#3a3328', roughness: 0.95 }),
    eye: new THREE.MeshStandardMaterial({ color: '#c8d64a', emissive: '#4a5a10', roughness: 0.4 }),
    skin: SKIN.map(c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.8 })),
    cloth: ['#3b5a7a', '#7a3b3b', '#4a6b3a', '#6b5a3a', '#4a4a55', '#8a6a2a']
      .map(c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.85 })),
    hair: new THREE.MeshStandardMaterial({ color: '#222018', roughness: 0.9 }),
  };
}

function limb(THREE, mat, w, h, d, pivotY) {
  const pivot = new THREE.Group();
  pivot.position.y = pivotY;
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  mesh.position.y = -h / 2;
  mesh.castShadow = true;
  pivot.add(mesh);
  return pivot;
}

// A standing figure. skin and cloth are materials, zombie=true makes it greenish with glowing eyes.
function humanoid(THREE, mats, { skin, cloth, zombie = false, hairy = true } = {}) {
  const group = new THREE.Group();
  const skinMat = zombie ? mats.zombieSkin : skin;
  const clothMat = zombie ? mats.zombieCloth : cloth;

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.66, 0.26), clothMat);
  torso.position.y = 1.2;
  torso.castShadow = true;
  group.add(torso);

  const headPivot = new THREE.Group();
  headPivot.position.y = 1.65;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.17, 14, 10), skinMat);
  head.position.y = 0.12;
  head.castShadow = true;
  headPivot.add(head);
  if (hairy && !zombie) {
    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.175, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), mats.hair);
    hair.position.y = 0.14;
    headPivot.add(hair);
  }
  if (zombie) {
    for (const x of [-0.06, 0.06]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 6), mats.eye);
      eye.position.set(x, 0.12, -0.15);
      headPivot.add(eye);
    }
  }
  group.add(headPivot);

  const armL = limb(THREE, skinMat, 0.13, 0.6, 0.13, 1.5);
  armL.position.x = -0.32;
  const armR = limb(THREE, skinMat, 0.13, 0.6, 0.13, 1.5);
  armR.position.x = 0.32;
  const legL = limb(THREE, clothMat, 0.17, 0.8, 0.18, 0.8);
  legL.position.x = -0.12;
  const legR = limb(THREE, clothMat, 0.17, 0.8, 0.18, 0.8);
  legR.position.x = 0.12;
  group.add(armL, armR, legL, legR);

  return { group, parts: { armL, armR, legL, legR, head: headPivot } };
}

// A zombie. Arms are held forward, and the legs and arms sway while it walks.
export function createZombie(THREE, mats) {
  const { group, parts } = humanoid(THREE, mats, { zombie: true });
  parts.armL.rotation.x = -1.2;
  parts.armR.rotation.x = -1.2;
  group.userData.zombie = true;
  return { group, parts, phase: Math.random() * Math.PI * 2, falling: 0 };
}

// Animates a zombie. speed is in metres per second.
export function animateZombie(zombie, time, speed) {
  const swing = Math.sin(time * 6 + zombie.phase) * Math.min(0.6, speed * 0.4);
  zombie.parts.legL.rotation.x = swing;
  zombie.parts.legR.rotation.x = -swing;
  zombie.parts.armL.rotation.x = -1.2 + swing * 0.2;
  zombie.parts.armR.rotation.x = -1.2 - swing * 0.2;
  zombie.parts.head.rotation.x = Math.sin(time * 3 + zombie.phase) * 0.08;
}

// Passengers sit in the train, or stand, with their own clothes.
export function createPassenger(THREE, mats, seed) {
  const skin = mats.skin[seed % mats.skin.length];
  const cloth = mats.cloth[seed % mats.cloth.length];
  return humanoid(THREE, mats, { skin, cloth, hairy: true });
}
