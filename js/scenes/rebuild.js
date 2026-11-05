import { t, loc } from '../i18n/index.js';
import { MODULES, MODULE_IDS } from '../data/modules.js';
import { ROUTE } from '../data/stations.js';
import { canBuild, startBuilding } from '../core/rebuild.js';
import { RESOURCE_LABELS } from '../core/scavenge.js';
import { esc } from '../ui/dom.js';

// Rebuilding the world: modules at settlements. Only one module is built at a time.
export function render(root, ctx) {
  const state = ctx.state;
  if (!state) {
    ctx.go('menu');
    return null;
  }
  const lang = state.lang;
  const here = ROUTE[state.station];

  function costText(cost) {
    return Object.entries(cost)
      .map(([key, amount]) => `${amount} ${RESOURCE_LABELS[key]?.[lang] ?? key}`)
      .join(', ');
  }

  function draw() {
    const building = state.building;
    const cards = MODULE_IDS.map(id => {
      const m = MODULES[id];
      const built = state.modules.includes(id);
      const check = canBuild(state, id);
      const reason = built ? t('rebuild.built') : check.ok ? '' : t(`rebuild.reason.${check.reason}`);
      return `
        <article class="card ${built ? 'gone' : ''}">
          <div class="name">${esc(loc(m.name, lang))}</div>
          <div class="meta">${esc(loc(m.desc, lang))}</div>
          <div class="small-text">${t('rebuild.cost')}: ${esc(costText(m.cost))}</div>
          <div class="small-text">${t('rebuild.needs')}: ${esc(t(`skill.${m.skill}`))} · ${m.days} ${t('rebuild.daysShort')}</div>
          ${reason ? `<div class="small-text muted">${esc(reason)}</div>` : ''}
          <button class="btn primary" type="button" data-build="${id}" ${check.ok ? '' : 'disabled'}>${built ? t('rebuild.built') : t('rebuild.build')}</button>
        </article>`;
    }).join('');

    root.innerHTML = `
      <h2>${t('rebuild.title', { station: esc(loc(here.name, lang)) })}</h2>
      ${here.settlement ? '' : `<p class="panel">${t('rebuild.notSettlement')}</p>`}
      ${building
        ? `<section class="panel"><p>${t('rebuild.inProgress', { name: esc(loc(MODULES[building.id].name, lang)), n: building.daysLeft })}</p></section>`
        : ''}
      <div class="grid grid-cards">${cards}</div>
      <div class="row" style="margin-top:16px">
        <button id="act-back" class="btn" type="button">${t('rebuild.back')}</button>
      </div>`;

    root.querySelector('#act-back').addEventListener('click', () => ctx.go('map'));
    root.querySelectorAll('[data-build]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.build;
        const result = startBuilding(state, id);
        if (!result.ok) {
          ctx.toast(t(`rebuild.reason.${result.reason}`));
          return;
        }
        ctx.save();
        ctx.toast(t('rebuild.started', { name: loc(MODULES[id].name, lang) }));
        draw();
      });
    });
  }

  draw();
  return null;
}
