// Walking through the train in first person. Standing near a passenger shows
// a prompt; E (or the touch button) opens that passenger's card in the 2D layer.
import { createEngine } from './engine.js';
import { createFirstPerson } from './controls.js';
import { createHud, isTouchDevice } from './hud.js';
import { buildTrain, TRAIN_BOUNDS } from './train-world.js';
import { isAlive } from '../core/passengers.js';
import { t, loc } from '../i18n/index.js';
import { COUNTRIES, JOBS } from '../data/names.js';

const TALK_RANGE = 2.2;
const FRONT_CONE = 0.35;

// Runs the walk in container. onInteract(passengerId) is called when the player uses a passenger.
// Returns { setPaused, refresh, dispose }.
export function runTrainWalk({ container, passengers, lang = 'nl', quality = 'high', onInteract, onExit }) {
  const engine = createEngine(container, { fov: 70, quality });
  const touch = isTouchDevice();
  const hud = createHud(container, { touch });
  container.classList.add('walk-mode');

  const train = buildTrain(engine, passengers, { quality, lang });
  const seats = train.figures.map(f => f.seat);

  const controls = createFirstPerson({
    engine,
    element: engine.renderer.domElement,
    touchUi: hud.touchUi,
    bounds: TRAIN_BOUNDS,
    actions: { interact: () => talk() },
  });
  controls.colliders.push(...train.colliders);
  controls.setPosition(train.spawn.x, train.spawn.z);
  controls.setLook(0, -0.1);

  // A prompt and an exit button, in the 2D layer.
  const prompt = document.createElement('div');
  prompt.className = 'walk-prompt';
  prompt.setAttribute('role', 'status');
  prompt.setAttribute('aria-live', 'polite');
  container.appendChild(prompt);

  const exit = document.createElement('button');
  exit.type = 'button';
  exit.className = 'btn small walk-exit';
  exit.textContent = t('walk.exit');
  exit.addEventListener('click', () => onExit?.());
  container.appendChild(exit);

  let talkBtn = null;
  if (hud.buttons) {
    talkBtn = document.createElement('button');
    talkBtn.type = 'button';
    talkBtn.className = 'btn pad-btn';
    talkBtn.textContent = t('walk.talk');
    talkBtn.addEventListener('pointerdown', e => { e.preventDefault(); talk(); });
    hud.buttons.melee.parentElement.appendChild(talkBtn);
  }

  let target = null;
  let paused = false;

  function nearestPassenger() {
    const p = controls.position;
    const f = controls.forward();
    let best = null;
    let bestDist = TALK_RANGE;
    passengers.forEach((person, i) => {
      if (!isAlive(person)) return;
      const s = seats[i];
      const dx = s.x - p.x;
      const dz = s.z - p.z;
      const d = Math.hypot(dx, dz);
      if (d > bestDist) return;
      if (d > 0 && (dx * f.x + dz * f.z) / d < FRONT_CONE) return;
      bestDist = d;
      best = i;
    });
    return best;
  }

  function talk() {
    if (paused || target === null) return;
    onInteract?.(passengers[target].id);
  }

  function describe(person) {
    const country = COUNTRIES.find(c => c.code === person.country);
    const job = JOBS.find(j => j.id === person.job);
    return t('walk.prompt', {
      name: person.name,
      job: loc(job?.name, lang),
      country: loc(country?.name, lang),
    });
  }

  const update = () => {
    if (paused) {
      target = null;
      prompt.textContent = '';
      return;
    }
    const next = nearestPassenger();
    if (next !== target) {
      target = next;
      prompt.textContent = target === null ? '' : describe(passengers[target]);
    }
  };
  const unsubscribe = engine.onUpdate(update);
  engine.start();

  return {
    setPaused(value) {
      paused = value;
      controls.setEnabled(!value);
    },
    refresh() {
      train.refresh(passengers);
      target = null;
    },
    dispose() {
      unsubscribe();
      controls.dispose();
      hud.dispose();
      talkBtn?.remove();
      prompt.remove();
      exit.remove();
      container.classList.remove('walk-mode');
      train.dispose();
      engine.dispose();
    },
  };
}
