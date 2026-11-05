import { t, loc } from '../i18n/index.js';
import { COUNTRIES, JOBS } from '../data/names.js';
import { isAlive } from '../core/passengers.js';
import { bar, esc } from '../ui/dom.js';

const COUNTRY = Object.fromEntries(COUNTRIES.map(c => [c.code, c]));
const JOB = Object.fromEntries(JOBS.map(j => [j.id, j]));

// Phase 1: the overview of the passengers. Later phases add the daily tick,
// the hunger crisis, and the links to the other scenes.
let filter = { show: 'all', sort: 'name' };

export function render(root, ctx) {
  const state = ctx.state;
  if (!state) {
    ctx.go('menu');
    return;
  }
  const lang = state.lang;
  const alive = state.passengers.filter(isAlive).length;

  root.innerHTML = `
    <h2>${t('train.title')} · ${t('train.day', { day: state.day })}</h2>

    <div class="stat-strip" aria-label="${t('train.title')}">
      <div class="stat"><div class="label">${t('train.alive')}</div><div class="value">${alive}</div></div>
      <div class="stat"><div class="label">${t('train.food')}</div><div class="value">${state.stock.food}</div></div>
      <div class="stat"><div class="label">${t('train.fuel')}</div><div class="value">${state.stock.fuel}</div></div>
      <div class="stat"><div class="label">${t('train.materials')}</div><div class="value">${state.stock.materials}</div></div>
      <div class="stat"><div class="label">${t('train.conscience')}</div><div class="value">${state.conscience}</div></div>
    </div>

    <div class="row filter-row">
      <label class="small-text">${t('train.filter')}
        <select id="f-show">
          <option value="all">${t('train.filterAll')}</option>
          <option value="alive">${t('train.filterAlive')}</option>
          <option value="gone">${t('train.filterGone')}</option>
        </select>
      </label>
      <label class="small-text">${t('train.sortName')}
        <select id="f-sort">
          <option value="name">${t('train.sortName')}</option>
          <option value="age">${t('train.sortAge')}</option>
          <option value="health">${t('train.sortHealth')}</option>
          <option value="morale">${t('train.sortMorale')}</option>
        </select>
      </label>
    </div>

    <div id="cards" class="grid grid-cards"></div>
  `;

  const showSel = root.querySelector('#f-show');
  const sortSel = root.querySelector('#f-sort');
  showSel.value = filter.show;
  sortSel.value = filter.sort;

  const drawCards = () => {
    const cards = root.querySelector('#cards');
    cards.innerHTML = renderCards(state, lang, filter);
  };

  showSel.addEventListener('change', () => { filter.show = showSel.value; drawCards(); });
  sortSel.addEventListener('change', () => { filter.sort = sortSel.value; drawCards(); });
  drawCards();
}

function renderCards(state, lang, { show, sort }) {
  let list = state.passengers.slice();
  if (show === 'alive') list = list.filter(isAlive);
  if (show === 'gone') list = list.filter(p => !isAlive(p));

  const sorters = {
    name: (a, b) => a.name.localeCompare(b.name),
    age: (a, b) => a.age - b.age,
    health: (a, b) => b.health - a.health,
    morale: (a, b) => b.morale - a.morale,
  };
  list.sort(sorters[sort] ?? sorters.name);

  if (list.length === 0) return `<p class="muted">${t('train.empty')}</p>`;

  return list.map(p => {
    const country = COUNTRY[p.country];
    const job = JOB[p.job];
    const gone = !isAlive(p);
    const skillLabel = t(`skill.${p.skill}`);
    const goneLabel = gone ? `<span class="tag">${t(`train.gone.${p.status}`)}</span>` : '';
    return `
      <article class="card ${gone ? 'gone' : ''}" aria-label="${esc(p.name)}">
        <div class="name">${esc(p.name)}</div>
        <div class="meta">${esc(loc(country.name, lang))} · ${esc(loc(job.name, lang))} · ${t('train.age', { age: p.age })}</div>
        <div>
          <span class="tag">${esc(skillLabel)}</span>
          ${goneLabel}
        </div>
        <div class="small-text muted">${t('train.health')}</div>
        ${bar(p.health)}
        <div class="small-text muted">${t('train.morale')}</div>
        ${bar(p.morale, 'morale')}
      </article>`;
  }).join('');
}
