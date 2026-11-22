// config.js — the museum's rulebook: canvas size, movement and vision tuning
// for Velvet and the night watch, the house palette, and the small geometry
// helpers every other module borrows. One home for every magic number, so
// balancing the heist never means hunting through the whole codebase.

export const VIEW = { w: 1280, h: 800 };
export const HUD_H = 56;

// Velvet: quick on bare marble, a whisper on carpet, and only audible at all
// while running — the two noise radii are what guards actually react to.
export const PLAYER = {
  radius: 13,
  runSpeed: 174,
  sneakSpeed: 82,
  interactRange: 46,
  noiseRunMarble: 118,
  noiseRunCarpet: 44,
};

// The night watch: how far and how wide a flashlight reaches, how quickly
// suspicion ripens into a chase, and how long a chase remembers its quarry.
export const GUARD = {
  radius: 14,
  patrolSpeed: 68,
  investigateSpeed: 102,
  chaseSpeed: 169,
  coneRange: 238,
  coneHalfAngle: 0.62,
  catchRange: 27,
  suspiciousAt: 0.3,
  alertAt: 1,
  decayPerSec: 0.3,
  chaseMemorySec: 3.4,
};

// Midnight blue, brass and velvet red: the whole museum in one palette.
export const PALETTE = {
  floor: '#26304f',
  floorAlt: '#222b47',
  floorLine: '#131a2e',
  carpet: '#2b0f1d',
  carpetBand: '#471426',
  carpetEdge: '#8a6a2f',
  wall: '#39466e',
  wallTop: '#4b5c8c',
  wallSide: '#232c49',
  caseBody: '#2c3c63',
  caseGlass: 'rgba(160, 210, 240, 0.30)',
  caseTrim: '#c9a227',
  brass: '#c9a227',
  brassBright: '#f2c14e',
  lamp: '#ffb45e',
  pillar: '#5a6a99',
  pillarTop: '#7c8db5',
  crate: '#6e5130',
  crateEdge: '#8a683e',
  planter: '#274a2c',
  planterLeaf: '#3f7a44',
  gold: '#f2c14e',
  gem: '#9fe8ff',
  gemGlow: 'rgba(140, 225, 255, 0.55)',
  exitGlow: 'rgba(90, 255, 170, 0.5)',
  guardBody: '#2e3d6e',
  guardDark: '#1b2547',
  guardSkin: '#e8b98d',
  playerCoat: '#4a2d78',
  playerScarf: '#c22f4e',
  playerTeal: '#2ec4b6',
  ink: '#e9ecf5',
  inkDim: '#9aa5c4',
  danger: '#ff5347',
  warn: '#ffb347',
};

const FULL_TURN = Math.PI * 2;

// Pin a value inside [lo, hi]; the workhorse behind meters and mixes.
export function clamp(value, lo, hi) {
  if (value < lo) return lo;
  if (value > hi) return hi;
  return value;
}

// Straight-line blend between two values at fraction t.
export function lerp(a, b, t) {
  return a + (b - a) * t;
}

// Euclidean gap between two points on the hall floor.
export function distance(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

// The shortest signed rotation from one heading to another, in (-PI, PI].
// Positive means the target lies counterclockwise... in screen terms, the
// turn a guard's flashlight should take so it never swings the long way round.
export function angleDelta(from, to) {
  let delta = (to - from) % FULL_TURN;
  if (delta > Math.PI) delta -= FULL_TURN;
  else if (delta < -Math.PI) delta += FULL_TURN;
  return delta;
}

// Rotate a heading toward a target, travelling at most maxStep radians.
export function turnToward(current, target, maxStep) {
  const delta = angleDelta(current, target);
  if (Math.abs(delta) <= maxStep) return target;
  return current + Math.sign(delta) * maxStep;
}

// mulberry32: a tiny seeded random source. Staged scenes ask for it by seed
// so a screenshot taken today is the same screenshot taken tomorrow.
export function makeRng(seed) {
  let state = seed >>> 0;
  return function nextRandom() {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Inclusive containment: a point exactly on a rect's edge counts as inside,
// which is what lets Velvet slip along a carpet's very border.
export function pointInRect(x, y, rect) {
  return x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
}

// First-match scan over a list of rects (carpet zones, mostly).
export function pointInAnyRect(x, y, rects) {
  for (const rect of rects) {
    if (pointInRect(x, y, rect)) return true;
  }
  return false;
}
