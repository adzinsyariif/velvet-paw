// config.js — shared constants, palette and small math helpers for Velvet Paw.
// Everything else imports from here so tuning lives in exactly one place.

export const VIEW = { w: 1280, h: 800 };
export const HUD_H = 56;

export const PLAYER = {
  radius: 13,
  runSpeed: 174,
  sneakSpeed: 82,
  interactRange: 46,
  noiseRunMarble: 118,
  noiseRunCarpet: 44,
};

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

export function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function distance(x1, y1, x2, y2) {
  return Math.hypot(x2 - x1, y2 - y1);
}

// Smallest signed difference between two angles, in (-PI, PI].
export function angleDelta(from, to) {
  let d = (to - from) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

export function turnToward(current, target, maxStep) {
  const d = angleDelta(current, target);
  if (Math.abs(d) <= maxStep) return target;
  return current + Math.sign(d) * maxStep;
}

// Deterministic RNG (mulberry32) so staged screenshots are reproducible.
export function makeRng(seed) {
  let a = seed >>> 0;
  return function rng() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pointInRect(x, y, r) {
  return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
}

export function pointInAnyRect(x, y, rects) {
  for (const r of rects) if (pointInRect(x, y, r)) return true;
  return false;
}
