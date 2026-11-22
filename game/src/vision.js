// vision.js — the geometry of being seen. Three questions live here: does a
// sight line cross a solid, does a point fall inside a guard's flashlight
// cone, and how fast should suspicion grow when it does. Movement collision
// lives here too, because sliding along the furniture is the same geometry.

import { GUARD, angleDelta, clamp, distance } from './config.js';

// Sight lines stop a hair inside each solid's face. Without the shrink, a
// guard pressed against one side of a display case would be blind to a cat
// pressed against the other — touching the glass should not grant invisibility.
const SIGHT_SHRINK_PX = 2;

// One axis of the slab test: narrow the [enter, leave] window of the segment
// against this axis's pair of planes, or report a clean miss.
function clipSlab(origin, delta, lo, hi, window) {
  if (Math.abs(delta) < 1e-9) {
    // Parallel to the slab: the whole segment sits inside it, or never enters.
    return origin >= lo && origin <= hi;
  }
  let enter = (lo - origin) / delta;
  let leave = (hi - origin) / delta;
  if (enter > leave) {
    const swap = enter;
    enter = leave;
    leave = swap;
  }
  window.enter = Math.max(window.enter, enter);
  window.leave = Math.min(window.leave, leave);
  return window.enter <= window.leave;
}

// Does the segment (x1, y1) -> (x2, y2) touch or cross rect r?
export function segmentHitsRect(x1, y1, x2, y2, r) {
  const window = { enter: 0, leave: 1 };
  if (!clipSlab(x1, x2 - x1, r.x, r.x + r.w, window)) return false;
  if (!clipSlab(y1, y2 - y1, r.y, r.y + r.h, window)) return false;
  return true;
}

// An unobstructed straight line between two points, against every solid.
export function lineOfSight(x1, y1, x2, y2, solids) {
  for (const solid of solids) {
    const inner = {
      x: solid.x + SIGHT_SHRINK_PX,
      y: solid.y + SIGHT_SHRINK_PX,
      w: solid.w - SIGHT_SHRINK_PX * 2,
      h: solid.h - SIGHT_SHRINK_PX * 2,
    };
    if (inner.w <= 0 || inner.h <= 0) continue; // too thin to hide behind
    if (segmentHitsRect(x1, y1, x2, y2, inner)) return false;
  }
  return true;
}

// Range first, then the cone's angular gate, then the sight line itself.
// Very close targets skip the angle test: a guard feels a cat at his boots
// no matter which way the flashlight points.
export function guardSeesPoint(guard, tx, ty, solids) {
  const gap = distance(guard.x, guard.y, tx, ty);
  if (gap > GUARD.coneRange) return false;
  if (gap > 24 && !insideConeSweep(guard, tx, ty)) return false;
  return lineOfSight(guard.x, guard.y, tx, ty, solids);
}

// Is the target within the cone's half-angle of the guard's facing?
export function insideConeSweep(guard, tx, ty) {
  const bearing = Math.atan2(ty - guard.y, tx - guard.x);
  const offAxis = Math.abs(angleDelta(guard.angle, bearing));
  return offAxis <= GUARD.coneHalfAngle;
}

// How much of the cone's length lies between guard and target, 0..1.
// The renderer and the detection maths share this so what the player sees
// (a cone that brightens as it closes in) matches what the guard feels.
export function coneReachFraction(guard, tx, ty) {
  return clamp(1 - distance(guard.x, guard.y, tx, ty) / GUARD.coneRange, 0, 1);
}

// Suspicion gained per second while the player stands in the beam.
// Close, upright and floodlit is a disaster; far away, low and wrapped in
// carpet shadow, a guard's meter barely crawls.
export function detectionMeterRises(guard, player, inShadow) {
  let rate = 0.55 + 1.5 * coneReachFraction(guard, player.x, player.y);
  if (player.gait === 'run') rate *= 1.5;
  else if (player.gait === 'sneak') rate *= 0.45;
  if (inShadow) rate *= 0.35;
  return rate;
}

// Move a round body by (dx, dy), sliding along solid rects. The axes are
// resolved one at a time so actors glide around corners instead of sticking.
export function slideMove(body, dx, dy, solids) {
  body.x += dx;
  for (const solid of solids) pushOutOfRect(body, solid, 'x');
  body.y += dy;
  for (const solid of solids) pushOutOfRect(body, solid, 'y');
}

// If the body's circle overlaps the rect, shove it out along one axis,
// landing on whichever face it approached from.
function pushOutOfRect(body, rect, axis) {
  const radius = body.radius;
  const nearestX = clamp(body.x, rect.x, rect.x + rect.w);
  const nearestY = clamp(body.y, rect.y, rect.y + rect.h);
  const offX = body.x - nearestX;
  const offY = body.y - nearestY;
  if (offX * offX + offY * offY >= radius * radius) return; // no overlap
  if (axis === 'x') {
    const centreX = rect.x + rect.w / 2;
    body.x = body.x < centreX ? rect.x - radius : rect.x + rect.w + radius;
  } else {
    const centreY = rect.y + rect.h / 2;
    body.y = body.y < centreY ? rect.y - radius : rect.y + rect.h + radius;
  }
}
