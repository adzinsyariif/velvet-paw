// player.js — Velvet herself. This module owns how she moves (two gaits,
// one cat), when her paws make sound, how much noise a stride throws across
// the hall for guards to hear, and what the interact key would reach.

import { PLAYER, distance, pointInAnyRect } from './config.js';
import { slideMove } from './vision.js';
import { moveVector, sneaking } from './input.js';

// Pacing of pawfalls, in seconds between steps per gait. Sneaking is slower
// in every sense: fewer steps, and each one too soft to broadcast.
const STEP_SECONDS = { sneak: 0.42, run: 0.26 };

// A fresh cat at a hall's entrance, facing the room she is about to rob.
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

// How loud the floor makes her right now. Sneaking is silent anywhere;
// running rings on marble and merely whispers across carpet shadow.
function strideNoise(p, isSneaking) {
  if (!p.moving || isSneaking) return null;
  return {
    x: p.x,
    y: p.y,
    r: p.inShadow ? PLAYER.noiseRunCarpet : PLAYER.noiseRunMarble,
  };
}

export function updatePlayer(p, dt, world) {
  const wish = moveVector();
  const low = sneaking();
  p.moving = wish.x !== 0 || wish.y !== 0;
  p.inShadow = pointInAnyRect(p.x, p.y, world.shadows);

  if (p.moving) {
    p.gait = low ? 'sneak' : 'run';
    const stride = low ? PLAYER.sneakSpeed : PLAYER.runSpeed;
    const wishLength = Math.hypot(wish.x, wish.y);
    p.angle = Math.atan2(wish.y, wish.x);
    slideMove(
      p,
      (wish.x / wishLength) * stride * dt,
      (wish.y / wishLength) * stride * dt,
      world.solids,
    );
    p.stepT -= dt;
    if (p.stepT <= 0) {
      world.sfx.footstep(!low);
      p.stepT = STEP_SECONDS[p.gait];
    }
  } else {
    p.gait = low ? 'sneak' : 'stand';
  }

  p.noise = strideNoise(p, low);
}

// What pressing E would do right now. The Moon Gem outranks everything —
// she came for it, after all — then the nearest pocketable treasure.
export function nearestInteract(p, level, taken) {
  const gemInReach = distance(p.x, p.y, level.gem.x, level.gem.y) <= PLAYER.interactRange;
  if (!taken.gem && gemInReach) return { kind: 'gem' };

  let nearest = null;
  let nearestGap = PLAYER.interactRange;
  level.loots.forEach((loot, index) => {
    if (taken.loots.has(index)) return;
    const gap = distance(p.x, p.y, loot.x, loot.y);
    if (gap <= nearestGap) {
      nearestGap = gap;
      nearest = { kind: 'loot', index, loot };
    }
  });
  return nearest;
}
