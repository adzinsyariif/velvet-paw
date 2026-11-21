// input.js — keyboard state: held keys for movement, edge-triggered presses
// for actions (interact, pause, mute, confirm, restart).

const HELD = new Set();
const PRESSED = new Set();

const PREVENT = new Set([
  'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space',
]);

let attached = false;

export function attachInput(onFirstGesture) {
  if (attached) return;
  attached = true;
  window.addEventListener('keydown', (e) => {
    if (PREVENT.has(e.code)) e.preventDefault();
    if (onFirstGesture) onFirstGesture();
    if (!e.repeat) PRESSED.add(e.code);
    HELD.add(e.code);
  });
  window.addEventListener('keyup', (e) => {
    HELD.delete(e.code);
  });
  window.addEventListener('pointerdown', () => {
    if (onFirstGesture) onFirstGesture();
  });
  window.addEventListener('blur', () => {
    HELD.clear();
  });
}

export function held(code) {
  return HELD.has(code);
}

// True only on the frame a key went down; consumes the press.
export function pressed(code) {
  if (PRESSED.has(code)) {
    PRESSED.delete(code);
    return true;
  }
  return false;
}

export function endFrame() {
  PRESSED.clear();
}

// Movement vector from WASD + arrow keys, not normalised (callers normalise).
export function moveVector() {
  let x = 0;
  let y = 0;
  if (held('KeyA') || held('ArrowLeft')) x -= 1;
  if (held('KeyD') || held('ArrowRight')) x += 1;
  if (held('KeyW') || held('ArrowUp')) y -= 1;
  if (held('KeyS') || held('ArrowDown')) y += 1;
  return { x, y };
}

export function sneaking() {
  return held('ShiftLeft') || held('ShiftRight');
}
