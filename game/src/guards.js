// guards.js — the night watch. Each guard runs a small state machine:
// patrol his route, investigate a glimpse or a noise, search the spot where
// the trail went cold, and chase outright once his suspicion meter fills.
// Losing the cat mid-chase drops him back to searching her last seen spot,
// and a fruitless search walks him home to the nearest leg of his route.

import { GUARD, clamp, distance, turnToward } from './config.js';
import { guardSeesPoint, detectionMeterRises, slideMove } from './vision.js';

// The four tempers of the watch, named for what the player should feel.
const MOOD_CALM = 'calm';
const MOOD_WARY = 'wary';
const MOOD_ALARMED = 'alarmed';

// Build a guard standing on the first waypoint of his route, already facing
// the second, so the hall is alive from the very first frame.
export function createGuard(def, index) {
  const [firstPost, secondPost = firstPost] = [def.route[0], def.route[1] ?? def.route[0]];
  return {
    x: firstPost.x,
    y: firstPost.y,
    radius: GUARD.radius,
    angle: Math.atan2(secondPost.y - firstPost.y, secondPost.x - firstPost.x),
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

// 'calm' | 'wary' | 'alarmed' — the renderer colours cones and ? / ! markers
// by this, and the HUD's alarm eye follows the most troubled guard.
export function guardMood(g) {
  if (g.state === 'chase') return MOOD_ALARMED;
  const troubled = g.meter >= GUARD.suspiciousAt || g.state === 'investigate' || g.state === 'search';
  return troubled ? MOOD_WARY : MOOD_CALM;
}

// Walk toward a point, turning the flashlight as he goes. Reports arrival
// once he stands within a body's breadth of the target.
function walkGuardToward(g, tx, ty, speed, dt, solids, turnRate = 9) {
  const gap = distance(g.x, g.y, tx, ty);
  if (gap < 2) return true;
  const bearing = Math.atan2(ty - g.y, tx - g.x);
  g.angle = turnToward(g.angle, bearing, turnRate * dt);
  const stride = Math.min(gap, speed * dt);
  slideMove(g, Math.cos(bearing) * stride, Math.sin(bearing) * stride, solids);
  return distance(g.x, g.y, tx, ty) < 6;
}

// The waypoint nearest to where the guard stands now — his way home after
// a search, so he rejoins the route instead of crossing the hall blindly.
function nearestRoutePost(g) {
  let chosen = 0;
  let chosenGap = Infinity;
  g.route.forEach((post, i) => {
    const gap = distance(g.x, g.y, post.x, post.y);
    if (gap < chosenGap) {
      chosenGap = gap;
      chosen = i;
    }
  });
  return chosen;
}

// A noise worth checking: a stamp on marble, a scuff too close. Even a calm
// guard turns for it — his meter jumps straight past casual suspicion.
export function guardHearsNoise(g, x, y) {
  if (g.state === 'chase') return; // already has a louder stimulus: the cat
  g.stimulus = { x, y };
  g.meter = Math.max(g.meter, GUARD.suspiciousAt + 0.08);
  g.state = 'investigate';
}

// Suspicion bookkeeping for one frame: the meter fills while the beam holds
// the player (ticking audibly as it climbs, so a careful player hears the
// danger), and drains away once the line of sight breaks.
function updateSuspicion(g, dt, world) {
  const { player, solids } = world;
  const sees = guardSeesPoint(g, player.x, player.y, solids);
  g.seesPlayer = sees;

  if (!sees) {
    g.lostT += dt;
    g.meter = clamp(g.meter - GUARD.decayPerSec * dt, 0, 1);
    return;
  }

  const fillRate = detectionMeterRises(g, player, player.inShadow);
  g.meter = clamp(g.meter + fillRate * dt, 0, 1);
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
}

// Meter-driven promotions and demotions between the machine's states.
// A full meter is a chase and a spotted penalty; a chase that loses its
// cat cools into a search; a warm meter pulls a patrolling guard off route.
function applyStateTransitions(g, world) {
  if (g.meter >= GUARD.alertAt && g.state !== 'chase') {
    g.state = 'chase';
    world.sfx.alert();
    world.onSpotted();
    return;
  }
  if (g.state === 'chase' && g.lostT > GUARD.chaseMemorySec) {
    g.state = 'search';
    g.searchT = 2.4;
    g.meter = 0.55;
    return;
  }
  const idleEnough = g.state === 'patrol' || g.state === 'search';
  if (idleEnough && g.meter >= GUARD.suspiciousAt && g.stimulus) {
    g.state = 'investigate';
  }
}

// Patrol: walk the route post to post. At a post with a waiting time, stand
// and sweep the flashlight in a slow arc — the window a good thief uses.
function stepPatrol(g, dt, world) {
  if (g.waitT > 0) {
    g.waitT -= dt;
    g.angle = g.holdAngle + Math.sin(world.time * 0.85 + g.lookPhase) * 0.65;
    return;
  }
  const post = g.route[g.wp];
  if (walkGuardToward(g, post.x, post.y, GUARD.patrolSpeed, dt, world.solids)) {
    g.waitT = post.wait || 0;
    g.holdAngle = g.angle;
    g.wp = (g.wp + 1) % g.route.length;
  }
}

// Investigate: go and look at whatever stirred him. Finding nothing, he
// settles into a short search of the spot.
function stepInvestigate(g, dt, world) {
  if (!g.stimulus) {
    g.state = 'patrol';
    return;
  }
  const arrived = walkGuardToward(g, g.stimulus.x, g.stimulus.y, GUARD.investigateSpeed, dt, world.solids);
  if (arrived) {
    g.state = 'search';
    g.searchT = 1.5;
  }
}

// Search: stand over the cold trail and swing the beam back and forth.
// When the timer dies he rejoins his route at its nearest post.
function stepSearch(g, dt, world) {
  g.searchT -= dt;
  g.angle += Math.sin(world.time * 2.1 + g.lookPhase) * 1.9 * dt;
  if (g.searchT <= 0) {
    g.wp = nearestRoutePost(g);
    g.state = 'patrol';
    g.stimulus = null;
  }
}

// Chase: run the cat down — at her last seen spot when the beam has lost
// her. Touching range ends the night.
function stepChase(g, dt, world) {
  const { player, solids } = world;
  const quarry = g.seesPlayer ? player : g.lastSeen || player;
  walkGuardToward(g, quarry.x, quarry.y, GUARD.chaseSpeed, dt, solids, 12);
  if (distance(g.x, g.y, player.x, player.y) < GUARD.catchRange) {
    world.onBusted();
  }
}

const STATE_STEPS = {
  patrol: stepPatrol,
  investigate: stepInvestigate,
  search: stepSearch,
  chase: stepChase,
};

// One frame of one guard: sense, judge, act.
export function updateGuard(g, dt, world) {
  updateSuspicion(g, dt, world);
  applyStateTransitions(g, world);
  const step = STATE_STEPS[g.state];
  if (step) step(g, dt, world);
  else g.state = 'patrol'; // an unknown state is a bug; fall back to the route
}
