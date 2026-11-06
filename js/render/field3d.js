// The scavenge field in 3D. The search has no time limit: you stop when you choose.
// Loot goes straight into the train's stock, so the bag, the hotbar and building
// work during the search. The rules live in field-logic.js and core/scavenge.js.
import { createEngine } from './engine.js';
import { createFirstPerson } from './controls.js';
import { createHud, isTouchDevice } from './hud.js';
import { buildArena } from './station-world.js';
import {
  createMaterials, createZombie, animateZombie, createPassenger, animateWave, animateWalk,
} from './characters.js';
import {
  FIELD, layoutArena, zombieStep, meleeTargets, shotTarget, crateCollected, spawnPoint,
  placeSurvivors, weaponSlots, slotUsable,
} from './field-logic.js';
import { createRng } from '../core/rng.js';
import { survivorsFor, RESOURCE_LABELS, RESOURCES } from '../core/scavenge.js';
import { canBuild, startBuilding } from '../core/rebuild.js';
import { MODULES, MODULE_IDS } from '../data/modules.js';
import { getSensitivity, getView } from './settings.js';
import { esc } from '../ui/dom.js';
import { t, loc } from '../i18n/index.js';

const FALL_TIME = 0.8;
const HOTBAR_REFRESH = 0.25; // seconds between hotbar redraws

// Runs one scavenge run in container. state: the game state (stock, building, modules).
// onEnd receives { collected, kills, heartsLost, downed, rescued, applyLoot: false }.
// Returns { dispose }.
export function runField({
  container, engine: engineOpts = {}, state, seed, station, crates, hearts, crewSize = 3,
  lang = 'nl', onEnd,
}) {
  const quality = engineOpts.quality ?? 'high';
  const stock = state.stock;
  const engine = createEngine(container, { fov: 72, quality });
  const { THREE } = engine;
  const touch = isTouchDevice();
  const hud = createHud(container, { touch });
  const mats = createMaterials(THREE);
  const view = getView();

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

  // The character you play, seen in third person.
  const avatar = createPassenger(THREE, mats, 0);
  engine.scene.add(avatar.group);

  const controls = createFirstPerson({
    engine,
    element: engine.renderer.domElement,
    touchUi: hud.touchUi,
    bounds: layout.bounds,
    sensitivity: getSensitivity(),
    view,
    avatar: avatar.group,
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

  // Crates in the world: each one knows its loot.
  const cratesWorld = layout.crates.map((c, i) => ({
    x: c.x, z: c.z, type: crates[i]?.type ?? 'food', amount: crates[i]?.amount ?? 0,
    mesh: arena.crates[i]?.mesh, taken: false,
  }));

  const world = {
    hearts,
    maxHearts: hearts,
    heartsLost: 0,
    kills: 0,
    collected: {},     // what this search found, for the summary
    slot: 0,
    cratesLeft: cratesWorld.length,
    rescued: 0,
    zombies: [],
    spawnT: 0,
    meleeCool: 0,
    shotCool: 0,
    invuln: 0,
    time: 0,
    hotbarT: 0,
    panel: null,       // 'build' | 'bag' | null
    over: false,
    downed: false,
    ended: false,
  };
  let reported = false;

  const slots = () => weaponSlots({ pistol: stock.pistol ?? 0, bat: stock.bat ?? 0 });
  const currentWeapon = () => slots()[world.slot]?.id ?? 'fists';

  function refreshHotbar() {
    hud.setHotbar(slots(), world.slot, stock.ammo, selectSlot);
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
    if (world.meleeCool > 0 || world.over || world.panel) return;
    const bat = currentWeapon() === 'bat';
    const range = bat ? FIELD.BAT_RANGE : FIELD.MELEE_RANGE;
    world.meleeCool = bat ? FIELD.MELEE_COOLDOWN * 1.3 : FIELD.MELEE_COOLDOWN;
    const hit = meleeTargets(world.zombies, controls.position, controls.forward(), range);
    hit.forEach(kill);
    hud.message(hit.length ? t('scav.msg.hit') : '');
  }

  // Shooting with the pistol, which needs the pistol in hand and ammo.
  function fire() {
    if (world.over || world.panel) return;
    if (currentWeapon() !== 'pistol') {
      hud.message(t('scav.msg.needPistol'));
      return;
    }
    if (world.shotCool > 0) return;
    if (stock.ammo <= 0) {
      hud.message(t('scav.msg.noAmmo'));
      return;
    }
    world.shotCool = FIELD.SHOT_COOLDOWN;
    stock.ammo -= 1;
    const target = shotTarget(world.zombies, controls.position, controls.forward());
    if (target) kill(target);
    hud.message(target ? t('scav.msg.hit') : '');
  }

  // ----- panels: building and the bag -----

  function openPanel(name) {
    world.panel = name;
    controls.setEnabled(false);
    if (document.pointerLockElement) document.exitPointerLock?.();
    drawPanel();
  }

  function closePanel() {
    world.panel = null;
    panelEl.hidden = true;
    controls.setEnabled(true);
  }

  function togglePanel(name) {
    if (world.panel === name) closePanel();
    else openPanel(name);
  }

  function drawPanel() {
    if (!world.panel) return;
    panelEl.hidden = false;
    if (world.panel === 'build') {
      panelEl.innerHTML = `
        <div class="field-panel-box" role="dialog" aria-label="${t('field.build')}">
          <h3>${t('field.build')}</h3>
          <p class="small-text muted">${t('field.buildIntro')}</p>
          ${state.building ? `<p class="small-text">${t('rebuild.inProgress', { name: esc(loc(MODULES[state.building.id].name, lang)), n: state.building.daysLeft })}</p>` : ''}
          <div class="field-panel-list">
            ${MODULE_IDS.map(id => {
              const m = MODULES[id];
              const built = state.modules.includes(id);
              const check = canBuild(state, id, { anywhere: true });
              const reason = built ? t('rebuild.built') : check.ok ? costOf(m) : t(`rebuild.reason.${check.reason}`);
              return `<div class="field-row">
                <div><strong>${esc(loc(m.name, lang))}</strong><div class="small-text muted">${esc(reason)}</div></div>
                <button class="btn small" type="button" data-build="${id}" ${check.ok ? '' : 'disabled'}>${t('rebuild.build')}</button>
              </div>`;
            }).join('')}
          </div>
          <div class="row" style="margin-top:10px"><button class="btn" type="button" data-close>${t('common.close')}</button></div>
        </div>`;
    } else {
      const rows = RESOURCES.map(key => `
        <div class="field-row"><span>${esc(loc(RESOURCE_LABELS[key], lang))}</span><strong>${Math.floor(stock[key] ?? 0)}</strong></div>`).join('');
      const found = Object.entries(world.collected).filter(([, n]) => n > 0)
        .map(([k, n]) => `${n} ${esc(loc(RESOURCE_LABELS[k], lang))}`).join(', ');
      panelEl.innerHTML = `
        <div class="field-panel-box" role="dialog" aria-label="${t('field.bag')}">
          <h3>${t('field.bag')}</h3>
          <p class="small-text"><strong>${t('hb.label')}:</strong> ${esc(t(`hb.${currentWeapon()}`))}</p>
          <div class="field-panel-list">${rows}</div>
          <p class="small-text muted" style="margin-top:8px">${t('field.foundNow')}: ${found || t('field.nothingYet')}</p>
          <div class="row" style="margin-top:10px"><button class="btn" type="button" data-close>${t('common.close')}</button></div>
        </div>`;
    }
    panelEl.querySelector('[data-close]')?.addEventListener('click', closePanel);
    panelEl.querySelectorAll('[data-build]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.build;
        const result = startBuilding(state, id, { anywhere: true });
        if (!result.ok) {
          hud.message(t(`rebuild.reason.${result.reason}`));
          return;
        }
        hud.message(t('rebuild.started', { name: loc(MODULES[id].name, lang) }));
        drawPanel();
      });
    });
  }

  function costOf(m) {
    return Object.entries(m.cost).map(([k, n]) => `${n} ${loc(RESOURCE_LABELS[k], lang)}`).join(', ');
  }

  // The panel sits on top of the view; closing it returns to the search.
  const panelEl = document.createElement('div');
  panelEl.className = 'field-panel';
  panelEl.hidden = true;
  container.appendChild(panelEl);

  // Buttons for building, the bag and stopping the search. Work with keys and touch.
  const bar = document.createElement('div');
  bar.className = 'field-actions';
  bar.innerHTML = `
    <button type="button" class="btn small" data-act="build">${t('field.build')} (B)</button>
    <button type="button" class="btn small" data-act="bag">${t('field.bag')} (I)</button>
    <button type="button" class="btn small primary" data-act="done">${t('field.done')}</button>`;
  container.appendChild(bar);
  bar.querySelector('[data-act="build"]').addEventListener('click', () => togglePanel('build'));
  bar.querySelector('[data-act="bag"]').addEventListener('click', () => togglePanel('bag'));
  bar.querySelector('[data-act="done"]').addEventListener('click', () => finishSearch());

  const onKey = e => {
    if (e.code === 'KeyB' && !e.repeat) togglePanel('build');
    if (e.code === 'KeyI' && !e.repeat) togglePanel('bag');
    if (e.code === 'Escape' && world.panel) closePanel();
  };
  window.addEventListener('keydown', onKey);

  function step(dt) {
    if (world.over) {
      if (!world.ended) finish();
      return;
    }
    world.time += dt;
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

    // Crates: walk over them. The loot goes straight into the stock.
    for (const c of crateCollected(cratesWorld, player)) {
      c.taken = true;
      if (c.mesh) c.mesh.visible = false;
      world.collected[c.type] = (world.collected[c.type] ?? 0) + c.amount;
      stock[c.type] = (stock[c.type] ?? 0) + c.amount;
      world.cratesLeft -= 1;
      hud.message(t('scav.msg.crate', { n: c.amount, type: loc(RESOURCE_LABELS[c.type], lang) }));
      refreshHotbar();
    }
    if (cratesWorld.length > 0 && world.cratesLeft <= 0 && !world.allFoundShown) {
      world.allFoundShown = true;
      hud.message(t('field.allFound'));
    }

    // The character moves in third person.
    animateWalk(avatar, world.time, controls.isMoving());

    world.hotbarT -= dt;
    if (world.hotbarT <= 0) {
      world.hotbarT = HOTBAR_REFRESH;
      refreshHotbar();
    }
    hud.update({
      timeLeft: null, // no time limit
      hearts: world.hearts,
      maxHearts: world.maxHearts,
      ammo: stock.ammo,
      cratesLeft: world.cratesLeft,
      rescued: world.rescued,
    });
  }

  // The player decides when to stop searching.
  function finishSearch() {
    if (world.over) return;
    world.over = true;
  }

  function finish() {
    world.ended = true;
    if (reported) return;
    reported = true;
    closePanel();
    // Stop the loop after this frame and hand the result to the scene.
    setTimeout(() => {
      engine.stop();
      onEnd({
        collected: world.collected,
        kills: world.kills,
        heartsLost: world.heartsLost,
        downed: world.downed,
        rescued: world.rescued,
        applyLoot: false, // the loot is already in the stock
      });
    }, 0);
  }

  if (hud.buttons) {
    hud.buttons.melee.addEventListener('pointerdown', e => { e.preventDefault(); strike(); });
    hud.buttons.shoot.addEventListener('pointerdown', e => { e.preventDefault(); fire(); });
  }

  engine.onUpdate(step);
  engine.start();
  refreshHotbar();

  return {
    dispose() {
      window.removeEventListener('keydown', onKey);
      controls.dispose();
      hud.dispose();
      arena.dispose();
      bar.remove();
      panelEl.remove();
      engine.dispose();
    },
  };
}
