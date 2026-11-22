// vision.js — geometry for sight: segment/rect tests, line of sight through
// the hall's solids, vision-cone membership, and circle movement with sliding.

import { GUARD, clamp, distance } from './config.js';

// Does segment (x1,y1)-(x2,y2) touch or cross rect r? Uses slab clipping.
export function segmentHitsRect(x1, y1, x2, y2, r) {
  let tMin = 0;
  let tMax = 1;
  const dx = x2 - x1;
  const dy = y2 - y1;
  if (Math.abs(dx) < 1e-9) {
    if (x1 < r.x || x1 > r.x + r.w) return false;
  } else {
    let t1 = (r.x - x1) / dx;
    let t2 = (r.x + r.w - x1) / dx;
    if (t1 > t2) { const t = t1; t1 = t2; t2 = t; }
    tMin = Math.max(tMin, t1);
    tMax = Math.min(tMax, t2);
    if (tMin > tMax) return false;
  }
  if (Math.abs(dy) < 1e-9) {
    if (y1 < r.y || y1 > r.y + r.h) return false;
  } else {
    let t1 = (r.y - y1) / dy;
    let t2 = (r.y + r.h - y1) / dy;
    if (t1 > t2) { const t = t1; t1 = t2; t2 = t; }
    tMin = Math.max(tMin, t1);
    tMax = Math.min(tMax, t2);
    if (tMin > tMax) return false;
  }
  return true;
}

// Clear sight line between two points, blocked by any solid rect.
// The endpoints' own cells are forgiving: a rect only blocks if the segment
// passes through its interior shrunk by a small margin, so standing right
// against a display case does not blind a guard to the player beside it.
export function lineOfSight(x1, y1, x2, y2, solids) {
  for (const s of solids) {
    const shrunk = { x: s.x + 2, y: s.y + 2, w: s.w - 4, h: s.h - 4 };
    if (shrunk.w <= 0 || shrunk.h <= 0) continue;
    if (segmentHitsRect(x1, y1, x2, y2, shrunk)) return false;
  }
  return true;
}

// Is the target inside the guard's vision cone (range + angle + sight line)?
export function guardSeesPoint(guard, tx, ty, solids) {
  const d = distance(guard.x, guard.y, tx, ty);
  if (d > GUARD.coneRange) return false;
  if (d > 24) {
    const ang = Math.atan2(ty - guard.y, tx - guard.x);
    let diff = Math.abs(((ang - guard.angle) % (Math.PI * 2) + Math.PI * 3) % (Math.PI * 2) - Math.PI);
    if (diff > GUARD.coneHalfAngle) return false;
  }
  return lineOfSight(guard.x, guard.y, tx, ty, solids);
}

// Detection fill rate per second for a guard who can see the player.
// Close, lit and upright fills fast; far, shadowed and sneaking fills slowly.
export function detectionMeterRises(guard, player, inShadow) {
  const d = distance(guard.x, guard.y, player.x, player.y);
  const proximity = clamp(1 - d / GUARD.coneRange, 0, 1);
  let rate = 0.55 + 1.5 * proximity;
  if (player.gait === 'run') rate *= 1.5;
  else if (player.gait === 'sneak') rate *= 0.45;
  if (inShadow) rate *= 0.35;
  return rate;
}

// Move a circle by (dx, dy), sliding along solid rects. Axis-separated so
// actors glide around corners instead of sticking to them.
export function slideMove(body, dx, dy, solids) {
  body.x += dx;
  for (const s of solids) pushOut(body, s, 'x');
  body.y += dy;
  for (const s of solids) pushOut(body, s, 'y');
}

function pushOut(body, s, axis) {
  const r = body.radius;
  const nearestX = clamp(body.x, s.x, s.x + s.w);
  const nearestY = clamp(body.y, s.y, s.y + s.h);
  const ddx = body.x - nearestX;
  const ddy = body.y - nearestY;
  if (ddx * ddx + ddy * ddy >= r * r) return;
  if (axis === 'x') {
    body.x = body.x < s.x + s.w / 2 ? s.x - r : s.x + s.w + r;
  } else {
    body.y = body.y < s.y + s.h / 2 ? s.y - r : s.y + s.h + r;
  }
}
