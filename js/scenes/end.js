import { t, loc } from '../i18n/index.js';
import { COUNTRIES } from '../data/names.js';
import { ENDING_TEXT } from '../data/endings.js';
import { aliveOf } from '../core/passengers.js';
import { esc } from '../ui/dom.js';

// Shown once the game has ended. main.js sends the player here whenever state.status is 'ended'.
export function render(root, ctx) {
  const state = ctx.state;
  if (!state || state.status !== 'ended') {
    ctx.go('menu');
    return null;
  }
  const lang = state.lang;
  const ending = ENDING_TEXT[state.ending] ?? ENDING_TEXT.stille;
  const survivors = aliveOf(state.passengers);
  const countries = [...new Set(survivors.map(p => p.country))];
  const countryNames = countries
    .map(code => loc(COUNTRIES.find(c => c.code === code)?.name, lang))
    .sort((a, b) => a.localeCompare(b));
  const built = state.modules.length;

  root.innerHTML = `
    <section class="panel hero" aria-labelledby="end-title">
      <p class="muted small-text">${t('end.kicker', { day: state.day })}</p>
      <h2 id="end-title">${esc(loc(ending.title, lang))}</h2>
      <p class="intro">${esc(loc(ending.text, lang))}</p>
    </section>

    <div class="grid grid-2">
      <section class="panel" aria-labelledby="stats-title">
        <h3 id="stats-title">${t('end.stats')}</h3>
        <ul class="log">
          <li>${t('end.survivors')}: <strong>${survivors.length}</strong> ${t('end.of')} ${state.passengers.length}</li>
          <li>${t('end.sacrificed')}: ${state.stats.sacrificed} · ${t('end.left')}: ${state.stats.left} · ${t('end.died')}: ${state.stats.died}</li>
          <li>${t('end.modules')}: ${built}</li>
          <li>${t('end.conscience')}: ${state.conscience}</li>
          <li>${t('end.zombies')}: ${state.stats.zombiesKilled}</li>
          <li>${t('end.searches')}: ${state.stats.scavenges}</li>
        </ul>
      </section>

      <section class="panel" aria-labelledby="countries-title">
        <h3 id="countries-title">${t('end.countries', { n: countries.length })}</h3>
        <p class="small-text">${countryNames.length ? esc(countryNames.join(', ')) : t('end.nobody')}</p>
      </section>
    </div>

    <div class="row" style="margin-top:8px">
      <button id="act-new" class="btn primary big" type="button">${t('end.newGame')}</button>
      <button id="act-menu" class="btn big" type="button">${t('end.menu')}</button>
    </div>`;

  root.querySelector('#act-new').addEventListener('click', () => ctx.startNewGame());
  root.querySelector('#act-menu').addEventListener('click', () => ctx.go('menu'));
  return null;
}
