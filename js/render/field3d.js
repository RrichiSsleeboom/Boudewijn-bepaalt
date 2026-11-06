// The scavenge field in 3D: the loop that moves the zombies, handles the fight,
// the crates, the survivors and the hotbar, and reports the result.
// The rules live in field-logic.js and core/scavenge.js.
import { createEngine } from './engine.js';
import { createFirstPerson } from './controls.js';
import { createHud, isTouchDevice } from './hud.js';
import { buildArena } from './station-world.js';
import {
  createMaterials, createZombie, animateZombie, createPassenger, animateWave,
} from './characters.js';
import {
  FIELD, layoutArena, zombieStep, meleeTargets, shotTarget, crateCollected, spawnPoint,
  placeSurvivors, weaponSlots, slotUsable,
} from './field-logic.js';
import { createRng } from '../core/rng.js';
import { survivorsFor, RESOURCE_LABELS } from '../core/scavenge.js';
import { getSensitivity } from './settings.js';
import { t, loc } from '../i18n/index.js';

const FALL_TIME = 0.8;
const HOTBAR_REFRESH = 0.25; // seconds between hotbar redraws (ammo can change)

// Runs one scavenge run in container. onEnd receives
// { collected, kills, heartsLost, downed, rescued }. Returns { dispose }.
// crates: the list from buildCrates ({ type, amount }). carried: { pistol, bat } from the train.
export function runField({
  container, engine: engineOpts = {}, seed, station, crates, hearts, ammo, carried = {},
  crewSize = 3, lang = 'nl', onEnd,
}) {
  const quality = engineOpts.quality ?? 'high';
  const engine = createEngine(container, { fov: 72, quality });
  const { THREE } = engine;
  const touch = isTouchDevice();
  const hud = createHud(container, { touch });
  const mats = createMaterials(THREE);

  // The layout depends on the station and the game seed, so each visit looks the same.
  const rng = createRng((seed + station * 7919) >>> 0);
  const layout = layoutArena(rng.next, crates.length);
  const arena = buildArena(engine, layout, { quality });
  crates.forEach((c, i) => arena.colorCrate(i, c.type));

  // Survivors hiding in the arena. Walking up to one brings them along.
  const survivors = placeSurvivors(rng.next, survivorsFor(crewSize), layout.colliders).map((s, i) => {
    const fig = createPassenger(THREE, mats, i + 3);
    fig.group.position.set(s.x, 0, s.z);
    fig.group.rotation.y = rng.next() * Math.PI * 2;
    engine.scene.add(fig.group);
    return { x: s.x, z: s.z, fig, rescued: false };
  });

  const controls = createFirstPerson({
    engine,
    element: engine.renderer.domElement,
    touchUi: hud.touchUi,
    bounds: layout.bounds,
    sensitivity: getSensitivity(),
    actions: {
      attack: () => strike(),
      shoot: () => fire(),
      interact: () => {},
      select: i => selectSlot(i),
    },
  });
  controls.colliders.push(...layout.colliders);
  controls.setPosition(layout.start.x, layout.start.z);
  // With yaw 0 the view points to -Z. A yaw of -PI/2 points to +X, towards the middle of the arena.
  controls.setLook(-Math.PI / 2, -0.12);
  if (hud.buttons) {
    hud.buttons.melee.addEventListener('pointerdown', e => { e.preventDefault(); strike(); });
    hud.buttons.shoot.addEventListener('pointerdown', e => { e.preventDefault(); fire(); });
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
    carried: { pistol: carried.pistol ?? 0, bat: carried.bat ?? 0 }, // weapons the crew holds
    slot: 0,
    timeLeft: FIELD.DURATION,
    cratesLeft: cratesWorld.length,
    rescued: 0,
    zombies: [],
    spawnT: 0,
    meleeCool: 0,
    shotCool: 0,
    invuln: 0,
    time: 0,
    hotbarT: 0,
    over: false,
    downed: false,
    ended: false,
  };
  let reported = false;

  function slots() {
    return weaponSlots(world.carried);
  }

  function currentWeapon() {
    return slots()[world.slot]?.id ?? 'fists';
  }

  function refreshHotbar() {
    hud.setHotbar(slots(), world.slot, world.ammo, selectSlot);
  }

  // Choosing a weapon. A slot you do not carry gives a message instead.
  function selectSlot(i) {
    const list = slots();
    if (i < 0 || i >= list.length) return;
    if (list[i].count <= 0) {
      hud.message(t('scav.msg.noWeapon'));
      return;
    }
    world.slot = i;
    refreshHotbar();
  }

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

  // Hitting with fists or with the bat.
  function strike() {
    if (world.meleeCool > 0 || world.over) return;
    const weapon = currentWeapon();
    const bat = weapon === 'bat';
    const range = bat ? FIELD.BAT_RANGE : FIELD.MELEE_RANGE;
    world.meleeCool = bat ? FIELD.MELEE_COOLDOWN * 1.3 : FIELD.MELEE_COOLDOWN;
    const hit = meleeTargets(world.zombies, controls.position, controls.forward(), range);
    hit.forEach(kill);
    hud.message(hit.length ? t('scav.msg.hit') : '');
  }

  // Shooting with the pistol, which needs the pistol in hand and ammo.
  function fire() {
    if (world.over) return;
    if (currentWeapon() !== 'pistol') {
      hud.message(t('scav.msg.needPistol'));
      return;
    }
    if (world.shotCool > 0) return;
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

    // Survivors wave until someone reaches them.
    for (const s of survivors) {
      if (s.rescued) continue;
      animateWave(s.fig, world.time + s.x);
      if (Math.hypot(s.x - player.x, s.z - player.z) < FIELD.RESCUE_RANGE) {
        s.rescued = true;
        s.fig.group.visible = false;
        world.rescued += 1;
        hud.message(t('scav.msg.rescued'));
      }
    }

    // Crates: walk over them to take the loot.
    for (const c of crateCollected(cratesWorld, player)) {
      c.taken = true;
      if (c.mesh) c.mesh.visible = false;
      world.collected[c.type] = (world.collected[c.type] ?? 0) + c.amount;
      if (c.type === 'ammo') world.ammo += c.amount;
      if (c.type === 'pistol' || c.type === 'bat') world.carried[c.type] += c.amount;
      world.cratesLeft -= 1;
      hud.message(t('scav.msg.crate', { n: c.amount, type: loc(RESOURCE_LABELS[c.type], lang) }));
      refreshHotbar();
    }
    if (cratesWorld.length > 0 && world.cratesLeft <= 0) world.over = true;

    world.hotbarT -= dt;
    if (world.hotbarT <= 0) {
      world.hotbarT = HOTBAR_REFRESH;
      refreshHotbar();
    }
    hud.update(world);
  }

  function finish() {
    world.ended = true;
    if (reported) return;
    reported = true;
    // Stop the loop after this frame and hand the result to the scene.
    setTimeout(() => {
      engine.stop();
      onEnd({
        collected: world.collected,
        kills: world.kills,
        heartsLost: world.heartsLost,
        downed: world.downed,
        rescued: world.rescued,
      });
    }, 0);
  }

  engine.onUpdate(step);
  engine.start();
  refreshHotbar();

  return {
    dispose() {
      controls.dispose();
      hud.dispose();
      arena.dispose();
      engine.dispose();
    },
    // For tests: a copy of the state.
    snapshot: () => ({ ...world, player: { ...controls.position } }),
  };
}
