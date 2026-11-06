import { hasSave } from '../core/state.js';
import { t } from '../i18n/index.js';
import { getQuality, setQuality } from '../render/settings.js';

export function render(root, ctx) {
  const saved = hasSave();
  const quality = getQuality();
  root.innerHTML = `
    <section class="panel hero" aria-labelledby="hero-title">
      <h2 id="hero-title">${t('app.title')}</h2>
      <p class="muted">${t('menu.tagline')}</p>
      <p class="intro">${t('menu.intro')}</p>
      <div class="stack">
        ${saved ? `<button class="btn big primary" type="button" data-act="continue">${t('menu.continue')}</button>` : ''}
        <button class="btn big ${saved ? '' : 'primary'}" type="button" data-act="new">${t('menu.new')}</button>
        ${saved ? `<button class="btn danger" type="button" data-act="clear">${t('menu.clear')}</button>` : ''}
      </div>
      <div class="row" style="justify-content:center;margin-top:18px">
        <label class="small-text">${t('menu.quality')}
          <select id="quality">
            <option value="high" ${quality === 'high' ? 'selected' : ''}>${t('menu.quality.high')}</option>
            <option value="low" ${quality === 'low' ? 'selected' : ''}>${t('menu.quality.low')}</option>
          </select>
        </label>
      </div>
    </section>
  `;

  root.querySelector('#quality').addEventListener('change', e => setQuality(e.target.value));

  root.querySelector('[data-act="new"]').addEventListener('click', () => ctx.startNewGame());
  root.querySelector('[data-act="continue"]')?.addEventListener('click', () => ctx.continueGame());
  root.querySelector('[data-act="clear"]')?.addEventListener('click', () => ctx.clearGame());
}
