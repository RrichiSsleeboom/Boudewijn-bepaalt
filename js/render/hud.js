// The 2D layer on top of the 3D view: stats, crosshair, messages and, on touch
// screens, a joystick, a look zone and two buttons.
import { t } from '../i18n/index.js';

export function isTouchDevice() {
  return navigator.maxTouchPoints > 0 || 'ontouchstart' in window;
}

export function createHud(container, { touch = false } = {}) {
  const el = document.createElement('div');
  el.className = 'field-hud';
  el.innerHTML = `
    <div class="hud-top">
      <span data-stat="time"></span>
      <span data-stat="hearts"></span>
      <span data-stat="ammo"></span>
      <span data-stat="crates"></span>
    </div>
    <div class="crosshair" aria-hidden="true"></div>
    <div class="hud-msg" role="status" aria-live="polite"></div>
    <div class="hud-hint" aria-hidden="true">${touch ? '' : t('scav.hint3d')}</div>
    ${touch ? `
      <div class="touch-layer">
        <div class="joystick" data-touch="joystick"><span class="knob"></span></div>
        <div class="look-zone" data-touch="look"></div>
        <div class="touch-buttons">
          <button type="button" class="btn pad-btn" data-action="melee">${t('scav.melee')}</button>
          <button type="button" class="btn pad-btn" data-action="shoot">${t('scav.shoot')}</button>
        </div>
      </div>` : ''}`;
  container.appendChild(el);

  const q = sel => el.querySelector(sel);
  const msgEl = q('.hud-msg');
  let msgTimer = 0;

  const touchUi = touch ? {
    joystick: q('[data-touch="joystick"]'),
    lookZone: q('[data-touch="look"]'),
  } : null;

  return {
    touchUi,
    buttons: touch ? {
      melee: q('[data-action="melee"]'),
      shoot: q('[data-action="shoot"]'),
    } : null,
    update(world) {
      q('[data-stat="time"]').textContent = `${t('scav.hud.time')} ${Math.max(0, Math.ceil(world.timeLeft))}s`;
      const full = '♥'.repeat(Math.max(0, world.hearts));
      const empty = '♡'.repeat(Math.max(0, world.maxHearts - world.hearts));
      q('[data-stat="hearts"]').textContent = `${t('scav.hud.hearts')} ${full}${empty}`;
      q('[data-stat="ammo"]').textContent = `${t('scav.hud.ammo')} ${world.ammo}`;
      q('[data-stat="crates"]').textContent = `${t('scav.hud.crates')} ${world.cratesLeft}`;
    },
    message(text) {
      msgEl.textContent = text;
      clearTimeout(msgTimer);
      msgTimer = setTimeout(() => { msgEl.textContent = ''; }, 1800);
    },
    dispose() {
      clearTimeout(msgTimer);
      el.remove();
    },
  };
}
