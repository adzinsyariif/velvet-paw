// guards.js — patrol routes, vision-driven detection meters, and the guard
// state machine: patrol -> investigate -> search -> patrol, with chase on a
// full meter. A guard who loses the player searches the last seen spot, then
// gives up and walks back to his route.

import { GUARD, clamp, distance, turnToward } from './config.js';
import { guardSeesPoint, detectionMeterRises, slideMove } from './vision.js';

export function createGuard(def, index) {
  const first = def.route[0];
  const second = def.route.length > 1 ? def.route[1] : def.route[0];
  return {
    x: first.x,
    y: first.y,
    radius: GUARD.radius,
    angle: Math.atan2(second.y - first.y, second.x - first.x),
    holdAngle: 0,
    route: def.route,
    wp: def.route.length > 1 ? 1 : 0,
    state: 'patrol',
    meter: 0,
    waitT: 0,
    lookPhase: index * 1.93,
    stimulus: null,
    lastSeen: null,
    lostT: 0,
    searchT: 0,
    tickT: 0,
    seesPlayer: false,
  };
}

// 'calm' | 'wary' | 'alarmed' — drives cone colour and the ? / ! markers.
export function guardMood(g) {
  if (g.state === 'chase') return 'alarmed';
  if (g.meter >= GUARD.suspiciousAt || g.state === 'investigate' || g.state === 'search') return 'wary';
  return 'calm';
}

function moveGuardToward(g, tx, ty, speed, dt, solids, turnRate = 9) {
  const d = distance(g.x, g.y, tx, ty);
  if (d < 2) return true;
  const step = Math.min(d, speed * dt);
  const ang = Math.atan2(ty - g.y, tx - g.x);
  g.angle = turnToward(g.angle, ang, turnRate * dt);
  slideMove(g, Math.cos(ang) * step, Math.sin(ang) * step, solids);
  return distance(g.x, g.y, tx, ty) < 6;
}

function nearestWaypoint(g) {
  let best = 0;
  let bestD = Infinity;
  g.route.forEach((w, i) => {
    const d = distance(g.x, g.y, w.x, w.y);
    if (d < bestD) { bestD = d; best = i; }
  });
  return best;
}

export function guardHearsNoise(g, x, y) {
  if (g.state === 'chase') return;
  g.stimulus = { x, y };
  g.meter = Math.max(g.meter, GUARD.suspiciousAt + 0.08);
  g.state = 'investigate';
}

export function updateGuard(g, dt, world) {
  const { player, solids } = world;
  const sees = guardSeesPoint(g, player.x, player.y, solids);
  g.seesPlayer = sees;

  if (sees) {
    const rate = detectionMeterRises(g, player, player.inShadow);
    g.meter = clamp(g.meter + rate * dt, 0, 1);
    g.lastSeen = { x: player.x, y: player.y };
    g.stimulus = { x: player.x, y: player.y };
    g.lostT = 0;
    if (g.meter > 0.15 && g.state !== 'chase') {
      g.tickT -= dt;
      if (g.tickT <= 0) {
        world.sfx.tick();
        g.tickT = 0.34;
      }
    }
  } else {
    g.lostT += dt;
    g.meter = clamp(g.meter - GUARD.decayPerSec * dt, 0, 1);
  }

  // State transitions driven by the meter.
  if (g.meter >= GUARD.alertAt && g.state !== 'chase') {
    g.state = 'chase';
    world.sfx.alert();
    world.onSpotted();
  } else if (g.state === 'chase' && g.lostT > GUARD.chaseMemorySec) {
    g.state = 'search';
    g.searchT = 2.4;
    g.meter = 0.55;
  } else if (
    (g.state === 'patrol' || g.state === 'search') &&
    g.meter >= GUARD.suspiciousAt &&
    g.stimulus
  ) {
    g.state = 'investigate';
  }

  switch (g.state) {
    case 'patrol': {
      if (g.waitT > 0) {
        g.waitT -= dt;
        // Standing post: sweep the flashlight slowly left and right.
        g.angle = g.holdAngle + Math.sin(world.time * 0.85 + g.lookPhase) * 0.65;
        break;
      }
      const target = g.route[g.wp];
      if (moveGuardToward(g, target.x, target.y, GUARD.patrolSpeed, dt, solids)) {
        g.waitT = target.wait || 0;
        g.holdAngle = g.angle;
        g.wp = (g.wp + 1) % g.route.length;
      }
      break;
    }
    case 'investigate': {
      if (!g.stimulus) { g.state = 'patrol'; break; }
      if (moveGuardToward(g, g.stimulus.x, g.stimulus.y, GUARD.investigateSpeed, dt, solids)) {
        g.state = 'search';
        g.searchT = 1.5;
      }
      break;
    }
    case 'search': {
      g.searchT -= dt;
      g.angle += Math.sin(world.time * 2.1 + g.lookPhase) * 1.9 * dt;
      if (g.searchT <= 0) {
        g.wp = nearestWaypoint(g);
        g.state = 'patrol';
        g.stimulus = null;
      }
      break;
    }
    case 'chase': {
      const target = sees ? player : g.lastSeen || player;
      moveGuardToward(g, target.x, target.y, GUARD.chaseSpeed, dt, solids, 12);
      if (distance(g.x, g.y, player.x, player.y) < GUARD.catchRange) {
        world.onBusted();
      }
      break;
    }
    default:
      g.state = 'patrol';
  }
}
