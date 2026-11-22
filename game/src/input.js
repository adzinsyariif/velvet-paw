// input.js — the keyboard, read two ways. Movement keys are polled as held
// state (is the key down right now?), while actions need edges (did the key
// go down this frame?). Held keys live in one set; each frame's fresh presses
// live in another, and a press is consumed by whoever asks first.

const keysDown = new Set();
const keysPressedThisFrame = new Set();

// Keys the browser would otherwise spend on scrolling the page.
const PAGE_KEYS = new Set([
  'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space',
]);

let listenersAttached = false;

// Wire the listeners once. The gesture callback fires on the first key or
// click — the audio module uses it to unlock the sound context.
export function attachInput(onFirstGesture) {
  if (listenersAttached) return;
  listenersAttached = true;

  window.addEventListener('keydown', (event) => {
    if (PAGE_KEYS.has(event.code)) event.preventDefault();
    if (onFirstGesture) onFirstGesture();
    if (!event.repeat) keysPressedThisFrame.add(event.code);
    keysDown.add(event.code);
  });

  window.addEventListener('keyup', (event) => {
    keysDown.delete(event.code);
  });

  window.addEventListener('pointerdown', () => {
    if (onFirstGesture) onFirstGesture();
  });

  // Alt-tabbing away mid-sneak must not leave a key stuck down forever.
  window.addEventListener('blur', () => {
    keysDown.clear();
  });
}

// Is this key physically down at the moment of asking?
export function held(code) {
  return keysDown.has(code);
}

// True exactly once per key press, on the frame it lands; asking consumes it,
// so two systems can never both spend the same press.
export function pressed(code) {
  if (!keysPressedThisFrame.has(code)) return false;
  keysPressedThisFrame.delete(code);
  return true;
}

// Called at the end of every frame: unspent presses expire here.
export function endFrame() {
  keysPressedThisFrame.clear();
}

// The eight-way wish of the movement keys, WASD and arrows alike.
// Deliberately left unnormalised — the player divides by the length so a
// diagonal is not secretly faster than a straight line.
export function moveVector() {
  const wish = { x: 0, y: 0 };
  if (held('KeyA') || held('ArrowLeft')) wish.x -= 1;
  if (held('KeyD') || held('ArrowRight')) wish.x += 1;
  if (held('KeyW') || held('ArrowUp')) wish.y -= 1;
  if (held('KeyS') || held('ArrowDown')) wish.y += 1;
  return wish;
}

// Either Shift key: Velvet drops into her low, silent gait.
export function sneaking() {
  return held('ShiftLeft') || held('ShiftRight');
}
