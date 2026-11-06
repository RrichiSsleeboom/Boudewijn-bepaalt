// The scavenge field in 3D: the loop that moves the zombies, handles the
// fight and the crates, and reports the result. The rules live in field-logic.js.
import { createEngine, THREE_VERSION } from './engine.js';
import { createFirstPerson } from './controls.js';
import { createHud, isTouchDevice } from './hud.js';
import { buildArena } from './station-world.js';
import { createMaterials, createZombie, animateZombie } from './characters.js';
import {
  FIELD, layoutArena, zombieStep, meleeTargets, shotTarget, crateCollected, spawnPoint,
} from './field-logic.js';
import { createRng } from '../core/rng.js';
import { t, loc } from '../i18n/index.js';

const FALL_TIME = 0.8;

// Runs one scavenge run in container. onEnd receives { collected, kills, heartsLost, downed }.
// Returns { dispose }. crates is the list from buildCrates: { type, amount }.
export function runField({
  container, engine: engineOpts = {}, seed, station, crates, hearts, ammo, lang = 'nl',
  onEnd,
}) {
  const engine = createEngine(container, { fov: 72, quality: engineOpts.quality ?? 'high' });
  const { THREE } = engine;
  const touch = isTouchDevice();
  const hud = createHud(container, { touch });
  const mats = createMaterials(THREE);

  // The layout depends on the station and the game seed, so each visit looks the same.
  const rng = createRng((seed + station * 7919) >>> 0);
  const layout = layoutArena(rng.next, crates.length);
  const arena = buildArena(engine, layout, { quality: engineOpts.quality ?? 'high' });
  crates.forEach((c, i) => arena.colorCrate(i, c.type));

  const controls = createFirstPerson({
    engine,
    element: engine.renderer.domElement,
    touchUi: hud.touchUi,
    bounds: layout.bounds,
    actions: {
      attack: () => melee(),
      shoot: () => shoot(),
      interact: () => {},
    },
  });
  controls.colliders.push(...layout.colliders);
  controls.setPosition(layout.start.x, layout.start.z);
  // With yaw 0 the view points to -Z. A yaw of -PI/2 points to +X, towards the middle of the arena.
  controls.setLook(-Math.PI / 2, -0.12);
  if (hud.buttons) {
    hud.buttons.melee.addEventListener('pointerdown', e => { e.preventDefault(); melee(); });
    hud.buttons.shoot.addEventListener('pointerdown', e => { e.preventDefault(); shoot(); });
  }

  // Crates in the world: each one knows its loot.
  const cratesWorld = layout.crates.map((c, i) => ({
    x: c.x, z: c.z, type: crates[i]?.type ?? 'food', amount: crates[i]?.amount ?? 0,
    mesh: arena.crates[i]?.mesh, taken: false,
  }));

  const world = {
    hearts,
    maxHearts: hearts,
    heartsLost: 0,
    ammo,
    kills: 0,
    collected: {},
    timeLeft: FIELD.DURATION,
    cratesLeft: cratesWorld.length,
    zombies: [],
    spawnT: 0,
    meleeCool: 0,
    shotCool: 0,
    invuln: 0,
    time: 0,
    over: false,
    downed: false,
    ended: false,
  };
  let reported = false;

  function spawnZombie() {
    const p = spawnPoint(layout.bounds, rng.next);
    const z = createZombie(THREE, mats);
    engine.scene.add(z.group);
    const speed = FIELD.ZOMBIE_SPEED[0] + rng.next() * (FIELD.ZOMBIE_SPEED[1] - FIELD.ZOMBIE_SPEED[0]);
    world.zombies.push({ x: p.x, z: p.z, speed, dead: false, falling: 0, model: z });
  }

  function kill(zombie) {
    if (zombie.dead) return;
    zombie.dead = true;
    world.kills += 1;
  }

  function melee() {
    if (world.meleeCool > 0 || world.over) return;
    world.meleeCool = FIELD.MELEE_COOLDOWN;
    const hit = meleeTargets(world.zombies, controls.position, controls.forward());
    hit.forEach(kill);
    hud.message(hit.length ? t('scav.msg.hit') : '');
  }

  function shoot() {
    if (world.shotCool > 0 || world.over) return;
    if (world.ammo <= 0) {
      hud.message(t('scav.msg.noAmmo'));
      return;
    }
    world.shotCool = FIELD.SHOT_COOLDOWN;
    world.ammo -= 1;
    const target = shotTarget(world.zombies, controls.position, controls.forward());
    if (target) kill(target);
    hud.message(target ? t('scav.msg.hit') : '');
  }

  function step(dt) {
    if (world.over) {
      if (!world.ended) finish();
      return;
    }
    world.time += dt;
    world.timeLeft -= dt;
    if (world.timeLeft <= 0) world.over = true;

    world.meleeCool = Math.max(0, world.meleeCool - dt);
    world.shotCool = Math.max(0, world.shotCool - dt);
    world.invuln = Math.max(0, world.invuln - dt);

    const player = controls.position;
    const alive = world.zombies.filter(z => !z.dead).length;
    world.spawnT -= dt;
    if (world.spawnT <= 0 && alive < FIELD.MAX_ZOMBIES) {
      world.spawnT = FIELD.SPAWN_EVERY;
      spawnZombie();
    }

    for (const z of world.zombies) {
      if (z.dead) {
        z.falling += dt;
        z.model.group.rotation.x = Math.min(Math.PI / 2, (z.falling / FALL_TIME) * (Math.PI / 2));
        if (z.falling > FALL_TIME + 2) {
          engine.scene.remove(z.model.group);
          z.removed = true;
        }
        continue;
      }
      zombieStep(z, player, dt, layout.colliders);
      z.model.group.position.set(z.x, 0, z.z);
      z.model.group.rotation.y = Math.atan2(player.x - z.x, player.z - z.z);
      animateZombie(z.model, world.time, z.speed);
      const dist = Math.hypot(player.x - z.x, player.z - z.z);
      if (dist < FIELD.CONTACT_RANGE && world.invuln <= 0) {
        world.hearts -= 1;
        world.heartsLost += 1;
        world.invuln = FIELD.INVULNERABLE;
        hud.message(t('scav.msg.grabbed'));
        if (world.hearts <= 0) {
          world.downed = true;
          world.over = true;
        }
      }
    }
    world.zombies = world.zombies.filter(z => !z.removed);

    for (const c of crateCollected(cratesWorld, player)) {
      c.taken = true;
      if (c.mesh) c.mesh.visible = false;
      world.collected[c.type] = (world.collected[c.type] ?? 0) + c.amount;
      if (c.type === 'ammo') world.ammo += c.amount;
      world.cratesLeft -= 1;
      hud.message(t('scav.msg.crate', { n: c.amount, type: loc(RES_LABEL[c.type], lang) }));
    }
    if (cratesWorld.length > 0 && world.cratesLeft <= 0) world.over = true;

    hud.update(world);
  }

  function finish() {
    world.ended = true;
    if (reported) return;
    reported = true;
    // Stop the loop after this frame and hand the result to the scene.
    setTimeout(() => {
      engine.stop();
      onEnd({ collected: world.collected, kills: world.kills, heartsLost: world.heartsLost, downed: world.downed });
    }, 0);
  }

  engine.onUpdate(step);
  engine.start();

  return {
    dispose() {
      controls.dispose();
      hud.dispose();
      arena.dispose();
      engine.dispose();
    },
    // For tests: a copy of the state.
    snapshot: () => ({ ...world, player: { ...controls.position } }),
    version: THREE_VERSION,
  };
}

const RES_LABEL = {
  food: { nl: 'voedsel', en: 'food' },
  fuel: { nl: 'brandstof', en: 'fuel' },
  ammo: { nl: 'munitie', en: 'ammo' },
  medicine: { nl: 'medicijnen', en: 'medicine' },
  materials: { nl: 'materiaal', en: 'materials' },
  parts: { nl: 'onderdelen', en: 'parts' },
};
