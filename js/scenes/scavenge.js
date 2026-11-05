import { t, loc } from '../i18n/index.js';
import { currentStation } from '../core/travel.js';
import {
  CREW_MIN, CREW_MAX, canScavenge, defaultCrew, eligibleCrew,
  maxHearts, buildCrates, finishScavenge, describeLoot,
} from '../core/scavenge.js';
import { esc } from '../ui/dom.js';

// Field size in game pixels. The canvas scales to the screen width.
const W = 480;
const H = 300;
const DURATION = 60;          // seconds
const PLAYER_SPEED = 120;     // px/s
const ZOMBIE_SPEED = [35, 60];
const MAX_ZOMBIES = 9;
const SPAWN_EVERY = 1.3;      // seconds
const BULLET_SPEED = 340;
const MELEE_RANGE = 38;
const MELEE_COOLDOWN = 0.45;
const SHOT_COOLDOWN = 0.25;
const INVULNERABLE = 1.0;
const CONTACT_RANGE = 15;
const CRATE_RANGE = 18;
const PLAYER_RADIUS = 10;
const ZOMBIE_RADIUS = 9;
const WALL_COUNT = 6;

const CRATE_ICON = { food: 'V', fuel: 'B', ammo: 'M', medicine: 'G', materials: 'S', parts: 'O' };
const KEY_DIR = {
  arrowup: [0, -1], w: [0, -1],
  arrowdown: [0, 1], s: [0, 1],
  arrowleft: [-1, 0], a: [-1, 0],
  arrowright: [1, 0], d: [1, 0],
};

export function render(root, ctx) {
  const state = ctx.state;
  if (!state) {
    ctx.go('menu');
    return null;
  }
  const gate = canScavenge(state);
  if (!gate.ok) {
    ctx.toast(t(`scav.reason.${gate.reason}`));
    ctx.go('map');
    return null;
  }

  const station = currentStation(state);
  let field = null;

  // Step 1: choose the crew.
  function showCrew() {
    const pool = eligibleCrew(state.passengers).slice().sort((a, b) => a.name.localeCompare(b.name));
    const preselected = new Set(defaultCrew(state.passengers));
    root.innerHTML = `
      <h2>${t('scav.title', { station: esc(loc(station.name)) })}</h2>
      <section class="panel" aria-labelledby="crew-title">
        <h3 id="crew-title">${t('scav.crewTitle')}</h3>
        <p class="muted">${t('scav.crewIntro', { min: CREW_MIN, max: CREW_MAX })}</p>
        <div class="stack crew-list">
          ${pool.map(p => `
            <label class="crew-item">
              <input type="checkbox" value="${p.id}" ${preselected.has(p.id) ? 'checked' : ''}>
              <span><strong>${esc(p.name)}</strong>
                <span class="muted small-text"> · ${esc(t(`skill.${p.skill}`))} · ${t('train.health')} ${p.health}</span>
              </span>
            </label>`).join('')}
        </div>
        <p id="crew-count" class="small-text muted" style="margin-top:10px"></p>
        <div class="row" style="margin-top:12px">
          <button id="act-start" class="btn primary big" type="button">${t('scav.start')}</button>
          <button id="act-back" class="btn" type="button">${t('scav.back')}</button>
        </div>
      </section>`;

    const boxes = [...root.querySelectorAll('input[type=checkbox]')];
    const startBtn = root.querySelector('#act-start');
    const count = root.querySelector('#crew-count');
    const refresh = () => {
      const n = boxes.filter(b => b.checked).length;
      startBtn.disabled = n < CREW_MIN || n > CREW_MAX;
      count.textContent = t('scav.selected', { n, min: CREW_MIN, max: CREW_MAX });
    };
    boxes.forEach(b => b.addEventListener('change', () => {
      if (boxes.filter(x => x.checked).length > CREW_MAX) b.checked = false;
      refresh();
    }));
    refresh();
    root.querySelector('#act-back').addEventListener('click', () => ctx.go('map'));
    startBtn.addEventListener('click', () => {
      showField(boxes.filter(b => b.checked).map(b => b.value));
    });
  }

  // Step 2: the minigame on a canvas.
  function showField(crewIds) {
    const crew = state.passengers.filter(p => crewIds.includes(p.id));
    root.innerHTML = `
      <h2>${t('scav.title', { station: esc(loc(station.name)) })}</h2>
      <p class="small-text muted">${t('scav.fieldHelp')}</p>
      <div class="field-wrap">
        <canvas id="field" width="${W}" height="${H}" role="img" aria-label="${t('scav.fieldLabel')}"></canvas>
      </div>
      <div class="pad" aria-label="${t('scav.controls')}">
        <button class="btn pad-btn" type="button" data-key="arrowup" aria-label="${t('scav.up')}">↑</button>
        <button class="btn pad-btn" type="button" data-key="arrowleft" aria-label="${t('scav.left')}">←</button>
        <button class="btn pad-btn" type="button" data-key="arrowdown" aria-label="${t('scav.down')}">↓</button>
        <button class="btn pad-btn" type="button" data-key="arrowright" aria-label="${t('scav.right')}">→</button>
        <button class="btn pad-btn wide" type="button" data-action="melee">${t('scav.melee')}</button>
        <button class="btn pad-btn wide" type="button" data-action="shoot">${t('scav.shoot')}</button>
      </div>
      <p class="small-text muted">${t('scav.keys')}</p>`;

    field = createField({
      canvas: root.querySelector('#field'),
      hearts: maxHearts(crew),
      ammo: state.stock.ammo,
      crates: buildCrates(station.loot),
      onEnd: summary => showResult(summary, crewIds),
    });

    root.querySelectorAll('[data-key]').forEach(btn => {
      const key = btn.dataset.key;
      btn.addEventListener('pointerdown', e => { e.preventDefault(); field.press(key, true); });
      btn.addEventListener('pointerup', () => field.press(key, false));
      btn.addEventListener('pointerleave', () => field.press(key, false));
    });
    root.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('pointerdown', e => { e.preventDefault(); field.action(btn.dataset.action); });
    });
    field.start();
  }

  // Step 3: the result. Applying it takes one day and returns the team to the map.
  function showResult(summary, crewIds) {
    const lang = state.lang;
    const crewNames = state.passengers.filter(p => crewIds.includes(p.id) && p.status === 'alive').map(p => esc(p.name));
    root.innerHTML = `
      <h2>${t('scav.resultTitle')}</h2>
      <section class="panel">
        <p>${summary.downed ? t('scav.resultDowned') : t('scav.resultDone')}</p>
        <ul class="log">
          <li>${t('scav.resultLoot')}: ${esc(describeLoot(summary.collected, lang))}</li>
          <li>${t('scav.resultKills')}: ${summary.kills}</li>
          <li>${t('scav.resultHearts')}: ${summary.heartsLost}</li>
          <li>${t('scav.resultCrew')}: ${crewNames.join(', ')}</li>
        </ul>
        <div class="row" style="margin-top:14px">
          <button id="act-finish" class="btn primary big" type="button">${t('scav.finish')}</button>
        </div>
      </section>`;
    root.querySelector('#act-finish').addEventListener('click', () => {
      finishScavenge(state, { ...summary, crewIds });
      ctx.save();
      ctx.go('map');
      ctx.toast(t('scav.done'));
    });
  }

  showCrew();

  return () => {
    field?.stop();
    field = null;
  };
}

// ---------- The minigame ----------

// Creates the field and runs the loop. onEnd receives the summary once.
function createField({ canvas, hearts, ammo, crates, onEnd }) {
  const g = canvas.getContext('2d');
  const keys = new Set();
  const requests = { melee: false, shoot: false };
  const walls = placeWalls();

  const world = {
    player: { x: 56, y: H / 2, fx: 1, fy: 0, meleeCool: 0, shotCool: 0, invuln: 0 },
    zombies: [],
    bullets: [],
    crates: placeCrates(crates, walls),
    walls,
    hearts,
    maxHearts: hearts,
    heartsLost: 0,
    ammo,
    kills: 0,
    collected: {},
    timeLeft: DURATION,
    spawnT: 0,
    swipe: 0,
    over: false,
    downed: false,
    lastT: 0,
    raf: 0,
  };
  const totalCrates = world.crates.length;

  const onKeyDown = e => {
    const key = e.key.toLowerCase();
    if (KEY_DIR[key]) { keys.add(key); e.preventDefault(); }
    if (key === ' ') { requests.melee = true; e.preventDefault(); }
    if (key === 'f') requests.shoot = true;
  };
  const onKeyUp = e => keys.delete(e.key.toLowerCase());

  function press(key, down) {
    if (down) keys.add(key); else keys.delete(key);
  }

  function action(name) {
    if (name === 'melee') requests.melee = true;
    if (name === 'shoot') requests.shoot = true;
  }

  function start() {
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    world.lastT = performance.now();
    world.raf = requestAnimationFrame(frame);
  }

  function stop() {
    cancelAnimationFrame(world.raf);
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
  }

  function frame(now) {
    const dt = Math.min(0.05, (now - world.lastT) / 1000);
    world.lastT = now;
    update(dt);
    draw();
    if (world.over) {
      stop();
      onEnd({ collected: world.collected, kills: world.kills, heartsLost: world.heartsLost, downed: world.downed });
      return;
    }
    world.raf = requestAnimationFrame(frame);
  }

  function killZombie(z) {
    if (z.dead) return;
    z.dead = true;
    world.kills += 1;
  }

  function update(dt) {
    const p = world.player;
    world.timeLeft -= dt;
    if (world.timeLeft <= 0) world.over = true;

    // Move the party.
    let dx = 0, dy = 0;
    for (const k of keys) {
      const d = KEY_DIR[k];
      if (d) { dx += d[0]; dy += d[1]; }
    }
    if (dx || dy) {
      const len = Math.hypot(dx, dy);
      dx /= len;
      dy /= len;
      p.fx = dx;
      p.fy = dy;
      moveEntity(p, dx * PLAYER_SPEED * dt, dy * PLAYER_SPEED * dt, PLAYER_RADIUS, walls);
    }

    p.meleeCool = Math.max(0, p.meleeCool - dt);
    p.shotCool = Math.max(0, p.shotCool - dt);
    p.invuln = Math.max(0, p.invuln - dt);
    world.swipe = Math.max(0, world.swipe - dt);

    if (requests.melee && p.meleeCool <= 0) {
      p.meleeCool = MELEE_COOLDOWN;
      world.swipe = 0.2;
      for (const z of world.zombies) {
        if (Math.hypot(z.x - p.x, z.y - p.y) <= MELEE_RANGE) killZombie(z);
      }
    }
    if (requests.shoot && p.shotCool <= 0 && world.ammo > 0) {
      p.shotCool = SHOT_COOLDOWN;
      world.ammo -= 1;
      world.bullets.push({ x: p.x, y: p.y, vx: p.fx * BULLET_SPEED, vy: p.fy * BULLET_SPEED, life: 1.2 });
    }
    requests.melee = false;
    requests.shoot = false;

    // Bullets fly until they hit a zombie, a wall, or time out.
    for (const b of world.bullets) {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      if (insideWall(b.x, b.y, 0, walls)) b.life = 0;
      for (const z of world.zombies) {
        if (!z.dead && Math.hypot(z.x - b.x, z.y - b.y) < 10) {
          killZombie(z);
          b.life = 0;
          break;
        }
      }
    }
    world.bullets = world.bullets.filter(b => b.life > 0 && b.x > 0 && b.x < W && b.y > 0 && b.y < H);

    // Zombies spawn at the edge and chase the party.
    world.spawnT -= dt;
    if (world.spawnT <= 0 && world.zombies.length < MAX_ZOMBIES) {
      world.spawnT = SPAWN_EVERY;
      world.zombies.push(spawnZombie());
    }
    for (const z of world.zombies) {
      if (z.dead) continue;
      const vx = p.x - z.x;
      const vy = p.y - z.y;
      const len = Math.hypot(vx, vy) || 1;
      moveEntity(z, (vx / len) * z.speed * dt, (vy / len) * z.speed * dt, ZOMBIE_RADIUS, walls);
      if (len < CONTACT_RANGE && p.invuln <= 0 && !world.over) {
        world.hearts -= 1;
        world.heartsLost += 1;
        p.invuln = INVULNERABLE;
        if (world.hearts <= 0) {
          world.downed = true;
          world.over = true;
        }
      }
    }
    world.zombies = world.zombies.filter(z => !z.dead);

    // Crates: walk over them to take the loot.
    for (const c of world.crates) {
      if (!c.taken && Math.hypot(c.x - p.x, c.y - p.y) < CRATE_RANGE) {
        c.taken = true;
        world.collected[c.type] = (world.collected[c.type] ?? 0) + c.amount;
        if (c.type === 'ammo') world.ammo += c.amount;
      }
    }
    world.crates = world.crates.filter(c => !c.taken);
    if (totalCrates > 0 && world.crates.length === 0) world.over = true;
  }

  function draw() {
    const p = world.player;
    g.fillStyle = '#2b3026';
    g.fillRect(0, 0, W, H);

    g.fillStyle = 'rgba(255,255,255,0.03)';
    for (let x = 0; x < W; x += 40) g.fillRect(x, 0, 1, H);

    g.fillStyle = '#5b4a3a';
    for (const w of world.walls) g.fillRect(w.x, w.y, w.w, w.h);

    for (const c of world.crates) {
      g.fillStyle = '#c9a54a';
      g.fillRect(c.x - 9, c.y - 9, 18, 18);
      g.fillStyle = '#1b1307';
      g.font = 'bold 12px system-ui';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(CRATE_ICON[c.type] ?? '?', c.x, c.y + 1);
    }

    g.fillStyle = '#7fb36b';
    for (const z of world.zombies) {
      g.beginPath();
      g.arc(z.x, z.y, ZOMBIE_RADIUS, 0, Math.PI * 2);
      g.fill();
    }

    g.fillStyle = '#fff3c4';
    for (const b of world.bullets) {
      g.beginPath();
      g.arc(b.x, b.y, 3, 0, Math.PI * 2);
      g.fill();
    }

    if (world.swipe > 0) {
      g.strokeStyle = 'rgba(224,136,58,0.8)';
      g.lineWidth = 3;
      g.beginPath();
      g.arc(p.x, p.y, MELEE_RANGE, 0, Math.PI * 2);
      g.stroke();
    }

    // The party blinks while it is invulnerable.
    if (p.invuln <= 0 || Math.floor(p.invuln * 10) % 2 === 0) {
      g.fillStyle = '#7fb3a4';
      g.beginPath();
      g.arc(p.x, p.y, PLAYER_RADIUS, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#0d1a17';
      g.fillRect(p.x + p.fx * 8 - 2, p.y + p.fy * 8 - 2, 4, 4);
    }

    drawHud();
  }

  function drawHud() {
    g.fillStyle = 'rgba(0,0,0,0.45)';
    g.fillRect(0, 0, W, 24);
    g.fillStyle = '#f1e9da';
    g.font = 'bold 13px system-ui';
    g.textBaseline = 'middle';
    g.textAlign = 'left';
    g.fillText(`${t('scav.hud.time')} ${Math.max(0, Math.ceil(world.timeLeft))}s`, 8, 12);
    const full = '♥'.repeat(Math.max(0, world.hearts));
    const empty = '♡'.repeat(Math.max(0, world.maxHearts - world.hearts));
    g.fillText(`${t('scav.hud.hearts')} ${full}${empty}`, 110, 12);
    g.fillText(`${t('scav.hud.ammo')} ${world.ammo}`, 300, 12);
    g.textAlign = 'right';
    g.fillText(`${t('scav.hud.crates')} ${world.crates.length}`, W - 8, 12);
  }

  return {
    start,
    stop,
    press,
    action,
  };
}

// ---------- Field helpers ----------

function insideWall(x, y, r, walls) {
  return walls.some(w => x + r > w.x && x - r < w.x + w.w && y + r > w.y && y - r < w.y + w.h);
}

// Walls are placed away from the left edge, where the party starts.
function placeWalls() {
  const walls = [];
  for (let i = 0; i < WALL_COUNT; i++) {
    const w = 40 + Math.floor(Math.random() * 30);
    const h = 20 + Math.floor(Math.random() * 20);
    const x = 120 + Math.random() * (W - 180);
    const y = 30 + Math.random() * (H - 60 - h);
    walls.push({ x, y, w, h });
  }
  return walls;
}

function placeCrates(list, walls) {
  return list.map(c => {
    let x = 0;
    let y = 0;
    for (let tries = 0; tries < 40; tries++) {
      x = 110 + Math.random() * (W - 130);
      y = 30 + Math.random() * (H - 60);
      if (!insideWall(x, y, 12, walls)) break;
    }
    return { ...c, x, y, taken: false };
  });
}

function spawnZombie() {
  const side = Math.floor(Math.random() * 4);
  let x;
  let y;
  if (side === 0) { x = -10; y = Math.random() * H; }
  else if (side === 1) { x = W + 10; y = Math.random() * H; }
  else if (side === 2) { x = Math.random() * W; y = -10; }
  else { x = Math.random() * W; y = H + 10; }
  const speed = ZOMBIE_SPEED[0] + Math.random() * (ZOMBIE_SPEED[1] - ZOMBIE_SPEED[0]);
  return { x, y, speed, dead: false };
}

// Moves an entity one axis at a time, so it slides along walls.
function moveEntity(e, dx, dy, r, walls) {
  const tryX = e.x + dx;
  if (!insideWall(tryX, e.y, r, walls) && tryX > r && tryX < W - r) e.x = tryX;
  const tryY = e.y + dy;
  if (!insideWall(e.x, tryY, r, walls) && tryY > r && tryY < H - r) e.y = tryY;
}
