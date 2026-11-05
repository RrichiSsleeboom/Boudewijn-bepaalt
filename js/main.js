import { loadGame, saveGame, newGame, clearSave } from './core/state.js';
import { getLang, setLang, t, LANGS } from './i18n/index.js';
import { toast } from './ui/dom.js';
import * as menu from './scenes/menu.js';
import * as train from './scenes/train.js';

// Scenes are modules with render(root, ctx). render may return a cleanup function
// (the scavenge scene needs it to stop its animation loop).
const SCENES = { menu, train };

const app = document.getElementById('app');
const ctx = {
  state: null,
  scene: 'menu',
  cleanup: null,
  t,
  toast,
  go,
  rerender,
  save,
  startNewGame,
  continueGame,
  clearGame,
};

function save() {
  if (ctx.state) saveGame(ctx.state);
}

function go(scene) {
  ctx.scene = scene;
  rerender();
}

function rerender() {
  if (ctx.cleanup) {
    ctx.cleanup();
    ctx.cleanup = null;
  }
  app.innerHTML = '';
  const mod = SCENES[ctx.scene] ?? menu;
  const cleanup = mod.render(app, ctx);
  ctx.cleanup = typeof cleanup === 'function' ? cleanup : null;
  updateChrome();
  app.focus({ preventScroll: true });
  window.scrollTo({ top: 0 });
}

function startNewGame() {
  ctx.state = newGame({ lang: getLang() });
  save();
  go('train');
  toast(t('menu.saved'));
}

function continueGame() {
  const state = loadGame();
  if (!state) {
    toast(t('menu.clearConfirm'));
    return;
  }
  ctx.state = state;
  go('train');
}

function clearGame() {
  if (!confirm(t('menu.clearConfirm'))) return;
  clearSave();
  ctx.state = null;
  go('menu');
}

function updateChrome() {
  document.documentElement.lang = getLang();
  document.title = t('app.title');
  document.getElementById('app-title').textContent = t('app.title');

  const menuBtn = document.getElementById('menu-btn');
  menuBtn.textContent = t('app.menu');
  menuBtn.hidden = ctx.scene === 'menu';

  const langBtn = document.getElementById('lang-btn');
  const other = LANGS.find(l => l !== getLang());
  langBtn.textContent = other === 'en' ? 'English' : 'Nederlands';
  langBtn.setAttribute('aria-label', other === 'en' ? 'Switch to English' : 'Schakel naar Nederlands');
}

document.getElementById('menu-btn').addEventListener('click', () => {
  if (ctx.state) save();
  go('menu');
});

document.getElementById('home-btn').addEventListener('click', () => {
  if (ctx.state) save();
  go('menu');
});

document.getElementById('lang-btn').addEventListener('click', () => {
  const other = LANGS.find(l => l !== getLang());
  setLang(other);
  if (ctx.state) {
    ctx.state.lang = other;
    save();
  }
  rerender();
});

// Start: go straight to the train if there is a save, otherwise to the menu.
const existing = loadGame();
if (existing) {
  ctx.state = existing;
}
rerender();
