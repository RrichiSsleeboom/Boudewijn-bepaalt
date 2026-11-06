import { t, loc } from '../i18n/index.js';
import { ROUTE } from '../data/stations.js';
import { canDepart, depart, fuelCost, nextStation } from '../core/travel.js';
import { canScavenge } from '../core/scavenge.js';
import { esc } from '../ui/dom.js';

// The route. Leaving happens here; events and crises are handled in the train view.
export function render(root, ctx) {
  const state = ctx.state;
  if (!state) {
    ctx.go('menu');
    return null;
  }

  const here = ROUTE[state.station];
  const next = nextStation(state);
  const check = canDepart(state);
  const scav = canScavenge(state);

  const stops = ROUTE.map((stop, index) => {
    let status = 'upcoming';
    if (index < state.station) status = 'visited';
    if (index === state.station) status = 'current';
    const marks = [];
    if (stop.haven) marks.push(t('map.haven'));
    if (stop.settlement) marks.push(t('map.settlement'));
    return `
      <li class="stop ${status}" ${index === state.station ? 'aria-current="location"' : ''}>
        <span class="stop-index">${index + 1}</span>
        <div>
          <div class="name">${esc(loc(stop.name))}</div>
          <div class="small-text muted">
            ${t(`map.status.${status}`)}${stop.distance ? ` · ${t('map.days', { n: stop.distance })}` : ''}
            ${marks.length ? ` · ${esc(marks.join(', '))}` : ''}
          </div>
        </div>
      </li>`;
  }).join('');

  const reasonText = {
    pending: t('map.reason.pending'),
    fuel: t('map.reason.fuel', { n: fuelCost(state) }),
    end: t('map.reason.end'),
    travelling: t('map.reason.travelling'),
  };

  root.innerHTML = `
    <h2>${t('map.title')}</h2>
    <div class="stat-strip">
      <div class="stat"><div class="label">${t('train.fuel')}</div><div class="value">${state.stock.fuel}</div></div>
      <div class="stat"><div class="label">${t('train.food')}</div><div class="value">${Math.floor(state.stock.food)}</div></div>
      <div class="stat"><div class="label">${t('map.here')}</div><div class="value">${esc(loc(here.name))}</div></div>
    </div>

    <div class="grid grid-2">
      <section class="panel" aria-labelledby="route-title">
        <h3 id="route-title">${t('map.route')}</h3>
        <ol class="route">${stops}</ol>
      </section>

      <section class="panel" aria-labelledby="depart-title">
        <h3 id="depart-title">${t('map.nextStop')}</h3>
        ${next
          ? `<p>${t('map.toStop', { name: esc(loc(next.name)), days: here.distance, fuel: fuelCost(state) })}</p>
             <button id="act-depart" class="btn primary big" type="button" ${check.ok ? '' : 'disabled'}>${t('map.depart')}</button>
             ${check.ok ? '' : `<p class="small-text muted" style="margin-top:10px">${reasonText[check.reason] ?? ''}</p>`}`
          : `<p>${t('map.arrivedHaven')}</p>`}
        <div class="row" style="margin-top:14px">
          <button id="act-scavenge" class="btn" type="button" ${scav.ok ? '' : 'disabled'}>${t('map.scavenge', { name: esc(loc(here.name)) })}</button>
          ${here.settlement ? `<button id="act-rebuild" class="btn" type="button">${t('map.rebuild', { name: esc(loc(here.name)) })}</button>` : ''}
        </div>
        ${scav.ok ? '' : `<p class="small-text muted" style="margin-top:8px">${t(`scav.reason.${scav.reason}`)}</p>`}
        <div class="row" style="margin-top:14px">
          <button id="act-back" class="btn" type="button">${t('map.toTrain')}</button>
        </div>
      </section>
    </div>
  `;

  root.querySelector('#act-back').addEventListener('click', () => ctx.go('train'));
  root.querySelector('#act-scavenge')?.addEventListener('click', () => ctx.go('scavenge'));
  root.querySelector('#act-rebuild')?.addEventListener('click', () => ctx.go('rebuild'));

  root.querySelector('#act-depart')?.addEventListener('click', () => {
    const result = depart(state);
    if (!result.ok) {
      ctx.toast(reasonText[result.reason] ?? '');
      return;
    }
    ctx.save();
    const arrived = result.arrived;
    // The journey is decided already; the view out of the window is shown first.
    playTravel(here.distance, () => {
      ctx.go('train');
      if (arrived) ctx.toast(t('map.arrivedAt', { name: loc(arrived) }));
    });
  });

  return () => {
    travelCancel?.();
  };

  // The view out of the window. Falls back to going straight to the train without 3D.
  function playTravel(days, after) {
    const overlay = document.createElement('div');
    overlay.className = 'walk-overlay travel-overlay';
    document.body.appendChild(overlay);
    let view = null;
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      view?.dispose();
      overlay.remove();
      travelCancel = null;
      after();
    };
    travelCancel = () => {
      if (done) return;
      done = true;
      view?.dispose();
      overlay.remove();
      travelCancel = null;
    };
    (async () => {
      try {
        const engine = await import('../render/engine.js');
        if (!engine.isWebGLAvailable()) throw new Error('no-webgl');
        const { runTravelView } = await import('../render/travel-view.js');
        if (done) return;
        view = runTravelView({ container: overlay, days, onDone: finish });
      } catch {
        finish();
      }
    })();
  }
}

let travelCancel = null;
