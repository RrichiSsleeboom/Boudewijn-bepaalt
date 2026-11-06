import { t, loc } from '../i18n/index.js';
import { currentStation } from '../core/travel.js';
import {
  CREW_MIN, CREW_MAX, canScavenge, defaultCrew, eligibleCrew,
  maxHearts, buildCrates, finishScavenge, describeLoot,
} from '../core/scavenge.js';
import { esc } from '../ui/dom.js';

// Scavenging: choose the crew (2D), then search the station in first person (3D).
// If 3D is not available, the search runs automatically and the result is the same.
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
  let cancelled = false;

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

  // Step 2: the search. Loads the 3D code; if that fails, the automatic search takes over.
  async function showField(crewIds) {
    const crew = state.passengers.filter(p => crewIds.includes(p.id));
    const hearts = maxHearts(crew);
    const crates = buildCrates(station.loot);
    root.innerHTML = `
      <h2>${t('scav.title', { station: esc(loc(station.name)) })}</h2>
      <p class="small-text muted">${t('scav.fieldHelp')}</p>
      <div id="stage" class="field-stage" aria-label="${t('scav.fieldLabel')}"></div>
      <p class="small-text muted">${t('scav.keys')}</p>`;
    const stage = root.querySelector('#stage');
    const onEnd = summary => {
      if (!cancelled) showResult({ ...summary, crewIds });
    };

    try {
      const engine = await import('../render/engine.js');
      if (!engine.isWebGLAvailable()) throw new Error('no-webgl');
      const { runField } = await import('../render/field3d.js');
      if (cancelled) return;
      field = runField({
        container: stage,
        seed: state.seed,
        station: state.station,
        crates,
        hearts,
        ammo: state.stock.ammo,
        lang: state.lang,
        onEnd,
      });
    } catch {
      if (cancelled) return;
      showAuto(crewIds, crates);
    }
  }

  // Fallback without 3D: the crew brings back half of the station's loot.
  function showAuto(crewIds, crates) {
    const collected = {};
    for (const c of crates) collected[c.type] = (collected[c.type] ?? 0) + Math.floor(c.amount / 2);
    root.innerHTML = `
      <h2>${t('scav.title', { station: esc(loc(station.name)) })}</h2>
      <section class="panel">
        <p>${t('scav.fallbackText')}</p>
        <div class="row" style="margin-top:12px">
          <button id="act-auto" class="btn primary big" type="button">${t('scav.fallbackGo')}</button>
          <button id="act-back" class="btn" type="button">${t('scav.back')}</button>
        </div>
      </section>`;
    root.querySelector('#act-auto').addEventListener('click', () => {
      showResult({ collected, kills: 0, heartsLost: 0, downed: false, crewIds });
    });
    root.querySelector('#act-back').addEventListener('click', () => ctx.go('map'));
  }

  // Step 3: the result. Applying it takes one day and returns the team to the map.
  function showResult(summary) {
    const { crewIds } = summary;
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
      finishScavenge(state, { collected: summary.collected, kills: summary.kills, crewIds, heartsLost: summary.heartsLost, downed: summary.downed });
      ctx.save();
      ctx.go('map');
      ctx.toast(t('scav.done'));
    });
  }

  showCrew();

  return () => {
    cancelled = true;
    field?.dispose();
    field = null;
  };
}
