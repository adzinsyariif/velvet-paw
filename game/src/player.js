// player.js — Velvet herself: movement and gaits, footstep timing, the noise
// she broadcasts while moving, and what she can interact with nearby.

import { PLAYER, distance, pointInAnyRect } from './config.js';
import { slideMove } from './vision.js';
import { moveVector, sneaking } from './input.js';

export function createPlayer(start) {
  return {
    x: start.x,
    y: start.y,
    radius: PLAYER.radius,
    angle: -Math.PI / 2,
    gait: 'stand',
    moving: false,
    inShadow: false,
    stepT: 0,
    noise: null,
  };
}

export function updatePlayer(p, dt, world) {
  const v = moveVector();
  const sneak = sneaking();
  const moving = v.x !== 0 || v.y !== 0;
  p.moving = moving;
  p.inShadow = pointInAnyRect(p.x, p.y, world.shadows);

  if (moving) {
    const len = Math.hypot(v.x, v.y);
    const speed = sneak ? PLAYER.sneakSpeed : PLAYER.runSpeed;
    p.gait = sneak ? 'sneak' : 'run';
    p.angle = Math.atan2(v.y, v.x);
    slideMove(p, (v.x / len) * speed * dt, (v.y / len) * speed * dt, world.solids);
    p.stepT -= dt;
    if (p.stepT <= 0) {
      world.sfx.footstep(!sneak);
      p.stepT = sneak ? 0.42 : 0.26;
    }
  } else {
    p.gait = sneak ? 'sneak' : 'stand';
  }

  // Running broadcasts noise; carpet muffles it, sneaking is silent.
  p.noise = null;
  if (moving && !sneak) {
    p.noise = {
      x: p.x,
      y: p.y,
      r: p.inShadow ? PLAYER.noiseRunCarpet : PLAYER.noiseRunMarble,
    };
  }
}

// What pressing E would do right now: the gem first, then the nearest loot.
export function nearestInteract(p, level, taken) {
  if (!taken.gem && distance(p.x, p.y, level.gem.x, level.gem.y) <= PLAYER.interactRange) {
    return { kind: 'gem' };
  }
  let best = null;
  let bestD = PLAYER.interactRange;
  level.loots.forEach((loot, i) => {
    if (taken.loots.has(i)) return;
    const d = distance(p.x, p.y, loot.x, loot.y);
    if (d <= bestD) {
      bestD = d;
      best = { kind: 'loot', index: i, loot };
    }
  });
  return best;
}
