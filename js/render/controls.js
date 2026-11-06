// First-person controls: keyboard (WASD, ZQSD for AZERTY, or arrows), mouse with
// pointer lock, and on touch screens a joystick on the left and a look-drag on the right.
// The player is a point on the floor with a radius, moving against simple box colliders.

// Arrows are matched by physical key, letters by the character they type,
// so both QWERTY (WASD) and AZERTY (ZQSD) keyboards walk.
const ARROW_KEYS = {
  ArrowUp: 'forward', ArrowDown: 'back', ArrowLeft: 'left', ArrowRight: 'right',
};
const LETTER_KEYS = {
  w: 'forward', z: 'forward',
  s: 'back',
  a: 'left', q: 'left',
  d: 'right',
};
function moveFor(e) {
  return ARROW_KEYS[e.code] ?? LETTER_KEYS[(e.key ?? '').toLowerCase()] ?? null;
}
const MAX_PITCH = 1.45;
const LOOK_SPEED = 0.0022;   // radians per pixel of mouse movement
const WALK_SPEED = 3.2;      // metres per second
const RUN_FACTOR = 1.7;
const PLAYER_RADIUS = 0.3;
const EYE_HEIGHT = 1.65;

export function createFirstPerson({ engine, element, touchUi = null, actions = {}, bounds = null }) {
  const { THREE, camera } = engine;
  const position = new THREE.Vector3(0, 0, 0);
  const keys = new Set();
  const colliders = []; // { minX, maxX, minZ, maxZ }
  const look = { yaw: 0, pitch: 0 };
  const joy = { x: 0, y: 0, active: false, id: null };
  const lookTouch = { id: null, lastX: 0, lastY: 0 };
  let locked = false;
  let enabled = true;
  let disposers = [];

  function on(target, type, fn, opts) {
    target.addEventListener(type, fn, opts);
    disposers.push(() => target.removeEventListener(type, fn, opts));
  }

  // ----- keyboard -----
  on(window, 'keydown', e => {
    if (!enabled) return;
    const move = moveFor(e);
    if (move) {
      keys.add(move);
      e.preventDefault();
    }
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') keys.add('run');
    if (e.code === 'Space' && !e.repeat) actions.attack?.();
    if (e.code === 'KeyF' && !e.repeat) actions.shoot?.();
    if (e.code === 'KeyE' && !e.repeat) actions.interact?.();
  });
  on(window, 'keyup', e => {
    const move = moveFor(e);
    if (move) keys.delete(move);
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') keys.delete('run');
  });
  // Releasing keys when the window loses focus avoids a stuck "walking" player.
  on(window, 'blur', () => keys.clear());

  // ----- mouse and pointer lock -----
  on(element, 'click', () => {
    if (enabled && !locked && element.requestPointerLock) element.requestPointerLock();
  });
  on(document, 'pointerlockchange', () => {
    locked = document.pointerLockElement === element;
  });
  on(document, 'mousemove', e => {
    if (!enabled || !locked) return;
    applyLook(e.movementX, e.movementY);
  });

  // ----- touch -----
  if (touchUi) {
    const { joystick, lookZone } = touchUi;
    on(joystick, 'pointerdown', e => {
      joy.active = true;
      joy.id = e.pointerId;
      joystick.setPointerCapture(e.pointerId);
      updateJoy(e);
    });
    on(joystick, 'pointermove', e => { if (joy.active && e.pointerId === joy.id) updateJoy(e); });
    const endJoy = e => {
      if (e.pointerId !== joy.id) return;
      resetJoy();
    };
    on(joystick, 'pointerup', endJoy);
    on(joystick, 'pointercancel', endJoy);

    on(lookZone, 'pointerdown', e => {
      if (lookTouch.id !== null) return;
      lookTouch.id = e.pointerId;
      lookTouch.lastX = e.clientX;
      lookTouch.lastY = e.clientY;
      lookZone.setPointerCapture(e.pointerId);
    });
    on(lookZone, 'pointermove', e => {
      if (e.pointerId !== lookTouch.id) return;
      applyLook((e.clientX - lookTouch.lastX) / 0.55, (e.clientY - lookTouch.lastY) / 0.55);
      lookTouch.lastX = e.clientX;
      lookTouch.lastY = e.clientY;
    });
    const endLook = e => {
      if (e.pointerId === lookTouch.id) lookTouch.id = null;
    };
    on(lookZone, 'pointerup', endLook);
    on(lookZone, 'pointercancel', endLook);
  }

  function updateJoy(e) {
    const rect = touchUi.joystick.getBoundingClientRect();
    const radius = rect.width / 2;
    let dx = (e.clientX - (rect.left + radius)) / radius;
    let dy = (e.clientY - (rect.top + radius)) / radius;
    const len = Math.hypot(dx, dy);
    if (len > 1) { dx /= len; dy /= len; }
    joy.x = dx;
    joy.y = dy;
    const knob = touchUi.joystick.querySelector('.knob');
    if (knob) knob.style.transform = `translate(${dx * radius * 0.6}px, ${dy * radius * 0.6}px)`;
  }

  function resetJoy() {
    joy.active = false;
    joy.x = 0;
    joy.y = 0;
    const knob = touchUi?.joystick.querySelector('.knob');
    if (knob) knob.style.transform = '';
  }

  function applyLook(dx, dy) {
    look.yaw -= dx * LOOK_SPEED;
    look.pitch = Math.max(-MAX_PITCH, Math.min(MAX_PITCH, look.pitch - dy * LOOK_SPEED));
  }

  // Returns the new position after moving by (dx, dz), sliding along colliders.
  function slide(dx, dz) {
    const nx = position.x + dx;
    if (!blocked(nx, position.z)) position.x = nx;
    const nz = position.z + dz;
    if (!blocked(position.x, nz)) position.z = nz;
  }

  function blocked(x, z) {
    for (const c of colliders) {
      if (x + PLAYER_RADIUS > c.minX && x - PLAYER_RADIUS < c.maxX &&
          z + PLAYER_RADIUS > c.minZ && z - PLAYER_RADIUS < c.maxZ) return true;
    }
    return false;
  }

  const update = dt => {
    if (!enabled) return;
    let fwd = 0;
    let side = 0;
    if (keys.has('forward')) fwd += 1;
    if (keys.has('back')) fwd -= 1;
    if (keys.has('right')) side += 1;
    if (keys.has('left')) side -= 1;
    side += joy.x;
    fwd -= joy.y;

    const len = Math.hypot(fwd, side);
    if (len > 0.01) {
      const speed = WALK_SPEED * (keys.has('run') ? RUN_FACTOR : 1) * Math.min(1, len);
      const s = Math.sin(look.yaw);
      const c = Math.cos(look.yaw);
      // Forward in the scene is -Z when yaw is 0.
      const dirX = (-s * fwd + c * side) / len;
      const dirZ = (-c * fwd - s * side) / len;
      slide(dirX * speed * dt, dirZ * speed * dt);
    }
    if (bounds) {
      position.x = Math.max(bounds.minX + PLAYER_RADIUS, Math.min(bounds.maxX - PLAYER_RADIUS, position.x));
      position.z = Math.max(bounds.minZ + PLAYER_RADIUS, Math.min(bounds.maxZ - PLAYER_RADIUS, position.z));
    }
    camera.position.set(position.x, position.y + EYE_HEIGHT, position.z);
    camera.rotation.set(look.pitch, look.yaw, 0, 'YXZ');
  };
  const unsubscribe = engine.onUpdate(update);

  return {
    position,
    look,
    colliders,
    // Puts the player on the floor at (x, z). Height is always the floor.
    setPosition(x, z) {
      position.set(x, 0, z);
    },
    setLook(yaw, pitch = 0) {
      look.yaw = yaw;
      look.pitch = pitch;
    },
    isLocked: () => locked,
    // The horizontal direction the player looks in, as a unit vector on the floor.
    forward: () => ({ x: -Math.sin(look.yaw), z: -Math.cos(look.yaw) }),
    setEnabled(value) {
      enabled = value;
      if (!value) keys.clear();
    },
    dispose() {
      unsubscribe();
      for (const d of disposers) d();
      disposers = [];
      if (document.pointerLockElement === element) document.exitPointerLock?.();
    },
  };
}
