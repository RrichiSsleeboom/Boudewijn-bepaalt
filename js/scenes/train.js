import { t, loc } from '../i18n/index.js';
import { COUNTRIES, JOBS } from '../data/names.js';
import { isAlive, isChild, aliveOf } from '../core/passengers.js';
import { advanceDay } from '../core/day.js';
import { dailyNeed, setRationing, snoozeHunger, refreshCrisis } from '../core/food.js';
import { METHODS, METHOD_EFFECTS, pickVictim, removePassenger } from '../core/sacrifice.js';
import { withRng } from '../core/rng.js';
import { bar, esc, toast } from '../ui/dom.js';
import { openModal } from '../ui/modal.js';

const COUNTRY = Object.fromEntries(COUNTRIES.map(c => [c.code, c]));
const JOB = Object.fromEntries(JOBS.map(j => [j.id, j]));
const LOG_LIMIT = 30;

// Filter and sort survive redraws.
const filter = { show: 'all', sort: 'name' };

export function render(root, ctx) {
  const state = ctx.state;
  if (!state) {
    ctx.go('menu');
    return null;
  }
  let modal = null;

  // ---------- Modals ----------

  function openCrisis() {
    const days = Math.floor(state.stock.food / Math.max(dailyNeed(state.passengers, state.rationing), 0.5));
    modal = openModal({
      title: t('crisis.title'),
      closable: false,
      labelledBy: 'crisis-title',
      body: `
        <p>${t('crisis.body', { days })}</p>
        <div class="choices">
          <button class="btn choice-btn" type="button" data-choice="ration">
            <strong>${t('crisis.ration')}</strong>
            <div class="choice-desc">${t('crisis.rationDesc')}</div>
          </button>
          <button class="btn choice-btn danger" type="button" data-choice="sacrifice">
            <strong>${t('crisis.sacrifice')}</strong>
            <div class="choice-desc">${t('crisis.sacrificeDesc')}</div>
          </button>
          <button class="btn choice-btn" type="button" data-choice="wait">
            <strong>${t('crisis.wait')}</strong>
            <div class="choice-desc">${t('crisis.waitDesc')}</div>
          </button>
        </div>`,
    });
    modal.body.querySelector('[data-choice="ration"]').addEventListener('click', () => {
      modal.close(true);
      modal = null;
      setRationing(state, true);
      state.pending = null;
      afterChange('act-next');
    });
    modal.body.querySelector('[data-choice="sacrifice"]').addEventListener('click', () => {
      modal.close(true);
      modal = null;
      openSacrifice();
    });
    modal.body.querySelector('[data-choice="wait"]').addEventListener('click', () => {
      modal.close(true);
      modal = null;
      snoozeHunger(state);
      afterChange('act-next');
    });
  }

  // Step 1 picks a method, step 2 shows the chosen person and asks to confirm.
  function openSacrifice() {
    const alive = aliveOf(state.passengers);
    if (alive.length === 0) {
      toast(t('sac.none'));
      return;
    }
    let victimId = null;
    let method = null;

    const back = () => {
      // Closing the sacrifice flow during a crisis brings the crisis back.
      if (state.pending) openCrisis();
    };

    modal = openModal({
      title: t('sac.title'),
      labelledBy: 'sac-title',
      onClose: () => {
        modal = null;
        back();
      },
      body: methodStep(),
    });
    bindMethodStep();

    function methodStep() {
      return `
        <p class="muted">${t('sac.intro')}</p>
        <div class="choices">
          ${METHODS.map(m => `
            <button class="btn choice-btn" type="button" data-method="${m}">
              <strong>${t(`sac.method.${m}`)}</strong>
              <div class="choice-desc">${t(`sac.desc.${m}`)} ${weightLabel(m)}</div>
            </button>`).join('')}
        </div>
        <div class="row" style="margin-top:12px">
          <button class="btn" type="button" data-act="cancel">${t('common.cancel')}</button>
        </div>`;
    }

    function bindMethodStep() {
      modal.body.querySelectorAll('[data-method]').forEach(btn => {
        btn.addEventListener('click', () => {
          method = btn.dataset.method;
          const victim = withRng(state, rng => pickVictim(state.passengers, method, rng));
          victimId = victim?.id ?? null;
          modal.setBody(victimStep(victim));
          bindVictimStep();
        });
      });
      modal.body.querySelector('[data-act="cancel"]').addEventListener('click', () => modal.close());
    }

    function victimStep(victim) {
      if (!victim) return `<p>${t('sac.none')}</p>`;
      const country = COUNTRY[victim.country];
      const job = JOB[victim.job];
      return `
        <p>${t('sac.victim', { name: esc(victim.name) })}</p>
        <article class="card">
          <div class="name">${esc(victim.name)}</div>
          <div class="meta">${esc(loc(country.name))} · ${esc(loc(job.name))} · ${t('train.age', { age: victim.age })}</div>
          <div class="small-text muted">${t('train.health')} · ${t('train.morale')}</div>
          ${bar(victim.health)}
          ${bar(victim.morale, 'morale')}
        </article>
        <div class="stack" style="margin-top:14px">
          <button class="btn danger big" type="button" data-act="confirm-sacrifice">${t('sac.confirm')}</button>
          ${state.atStation ? `<button class="btn big" type="button" data-act="confirm-left">${t('sac.leave')}</button>` : ''}
          <button class="btn" type="button" data-act="back">${t('sac.back')}</button>
        </div>`;
    }

    function bindVictimStep() {
      modal.body.querySelector('[data-act="confirm-sacrifice"]').addEventListener('click', () => confirm('sacrificed'));
      modal.body.querySelector('[data-act="confirm-left"]')?.addEventListener('click', () => confirm('left'));
      modal.body.querySelector('[data-act="back"]').addEventListener('click', () => {
        modal.setBody(methodStep());
        bindMethodStep();
      });
    }

    function confirm(how) {
      const person = removePassenger(state, victimId, method, how);
      modal.close(true);
      modal = null;
      if (person) {
        refreshCrisis(state);
        afterChange('act-sacrifice', how === 'left' ? t('sac.doneLeft', { name: person.name }) : t('sac.doneSacrificed', { name: person.name }));
      }
    }
  }

  function weightLabel(method) {
    const c = METHOD_EFFECTS[method].conscience;
    if (c <= 3) return t('sac.weight.light');
    if (c >= 10) return t('sac.weight.heavy');
    return t('sac.weight.medium');
  }

  // ---------- Page ----------

  function afterChange(focusId, message) {
    save(); // persist the change
    draw(focusId);
    if (message) toast(message);
  }

  function save() {
    ctx.save();
  }

  function draw(focusId) {
    root.innerHTML = view(state);
    bindPage();
    if (focusId) root.querySelector(`#${focusId}`)?.focus();
    if (state.pending && !modal) openCrisis();
  }

  function bindPage() {
    root.querySelector('#act-next')?.addEventListener('click', () => {
      const messages = advanceDay(state);
      const first = messages.length ? loc(messages[0]) : '';
      afterChange('act-next', first);
    });
    root.querySelector('#act-ration').addEventListener('click', () => {
      setRationing(state, !state.rationing);
      afterChange('act-ration');
    });
    root.querySelector('#act-sacrifice').addEventListener('click', () => openSacrifice());
    root.querySelector('#f-show').addEventListener('change', e => {
      filter.show = e.target.value;
      drawCards();
    });
    root.querySelector('#f-sort').addEventListener('change', e => {
      filter.sort = e.target.value;
      drawCards();
    });
    drawCards();
  }

  function drawCards() {
    const cards = root.querySelector('#cards');
    if (cards) cards.innerHTML = renderCards(state, filter);
  }

  draw();

  return () => {
    modal?.close(true);
    modal = null;
  };
}

// ---------- View helpers ----------

function view(state) {
  const alive = aliveOf(state.passengers).length;
  const need = dailyNeed(state.passengers, state.rationing);
  const log = state.log.slice(0, LOG_LIMIT);

  return `
    <h2>${t('train.title')} · ${t('train.day', { day: state.day })}</h2>

    <div class="stat-strip" aria-label="${t('train.title')}">
      <div class="stat"><div class="label">${t('train.alive')}</div><div class="value">${alive}</div></div>
      <div class="stat"><div class="label">${t('train.food')}</div><div class="value">${Math.floor(state.stock.food)}</div><div class="small-text muted">${t('train.foodNeed', { n: need })}</div></div>
      <div class="stat"><div class="label">${t('train.fuel')}</div><div class="value">${state.stock.fuel}</div></div>
      <div class="stat"><div class="label">${t('train.materials')}</div><div class="value">${state.stock.materials}</div></div>
      <div class="stat"><div class="label">${t('train.conscience')}</div><div class="value">${state.conscience}</div></div>
    </div>

    <div class="grid grid-2">
      <section class="panel" aria-labelledby="actions-title">
        <h3 id="actions-title">${t('train.actions')}</h3>
        <div class="row">
          <button id="act-next" class="btn primary" type="button" ${state.pending ? 'disabled' : ''}>${t('train.next')}</button>
          <button id="act-ration" class="btn" type="button">${state.rationing ? t('train.rationOff') : t('train.rationOn')}</button>
          <button id="act-sacrifice" class="btn danger" type="button">${t('train.sacrifice')}</button>
        </div>
        ${state.rationing ? `<p class="small-text muted" style="margin-top:10px">${t('train.rationingNote')}</p>` : ''}
        ${state.pending ? `<p class="small-text" style="margin-top:10px;color:var(--danger)">${t('train.crisisPending')}</p>` : ''}
      </section>

      <section class="panel" aria-labelledby="log-title">
        <h3 id="log-title">${t('train.logTitle')}</h3>
        ${log.length
          ? `<ul class="log">${log.map(e => `<li><span class="muted">${t('train.dayShort', { day: e.day })}</span> ${esc(loc(e.text))}</li>`).join('')}</ul>`
          : `<p class="muted">${t('train.logEmpty')}</p>`}
      </section>
    </div>

    <h3 style="margin-top:8px">${t('train.passengers')}</h3>
    <div class="row filter-row">
      <label class="small-text">${t('train.filter')}
        <select id="f-show">
          <option value="all" ${filter.show === 'all' ? 'selected' : ''}>${t('train.filterAll')}</option>
          <option value="alive" ${filter.show === 'alive' ? 'selected' : ''}>${t('train.filterAlive')}</option>
          <option value="gone" ${filter.show === 'gone' ? 'selected' : ''}>${t('train.filterGone')}</option>
        </select>
      </label>
      <label class="small-text">${t('train.sort')}
        <select id="f-sort">
          <option value="name" ${filter.sort === 'name' ? 'selected' : ''}>${t('train.sortName')}</option>
          <option value="age" ${filter.sort === 'age' ? 'selected' : ''}>${t('train.sortAge')}</option>
          <option value="health" ${filter.sort === 'health' ? 'selected' : ''}>${t('train.sortHealth')}</option>
          <option value="morale" ${filter.sort === 'morale' ? 'selected' : ''}>${t('train.sortMorale')}</option>
        </select>
      </label>
    </div>
    <div id="cards" class="grid grid-cards"></div>
  `;
}

function renderCards(state, { show, sort }) {
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
    const goneLabel = gone ? `<span class="tag">${t(`train.gone.${p.status}`)}</span>` : '';
    const childLabel = isChild(p) ? `<span class="tag">${t('train.child')}</span>` : '';
    return `
      <article class="card ${gone ? 'gone' : ''}" aria-label="${esc(p.name)}">
        <div class="name">${esc(p.name)}</div>
        <div class="meta">${esc(loc(country.name))} · ${esc(loc(job.name))} · ${t('train.age', { age: p.age })}</div>
        <div>
          <span class="tag">${esc(t(`skill.${p.skill}`))}</span>
          ${childLabel}
          ${goneLabel}
        </div>
        <div class="small-text muted">${t('train.health')}</div>
        ${bar(p.health)}
        <div class="small-text muted">${t('train.morale')}</div>
        ${bar(p.morale, 'morale')}
      </article>`;
  }).join('');
}
