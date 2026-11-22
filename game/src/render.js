// render.js — all canvas drawing for the play scene: a lamplit marble hall
// with gilt paintings and glass cases, the cat burglar and the guards, and
// the flashlight lighting. A darkness overlay is punched through by each
// guard's cone (raycast against the solids, so walls and cases genuinely
// block light), by the wall-sconce lamplight, the gem, the exit and Velvet.

import { PALETTE, GUARD, clamp } from './config.js';
import { FLOOR } from './levels.js';
import { guardMood } from './guards.js';

let lightCanvas = null;
let lightCtx = null;

function createLamplightLayer(w, h) {
  if (!lightCanvas) {
    lightCanvas = document.createElement('canvas');
    lightCanvas.width = w;
    lightCanvas.height = h;
    lightCtx = lightCanvas.getContext('2d');
  }
  return lightCtx;
}

// Entry parameter t (in pixels along the unit ray) where the ray enters rect
// r, or Infinity when it misses within maxDist.
function rayEntersRect(x, y, dx, dy, r, maxDist) {
  let tMin = 0;
  let tMax = maxDist;
  if (Math.abs(dx) < 1e-9) {
    if (x < r.x || x > r.x + r.w) return Infinity;
  } else {
    let t1 = (r.x - x) / dx;
    let t2 = (r.x + r.w - x) / dx;
    if (t1 > t2) { const t = t1; t1 = t2; t2 = t; }
    tMin = Math.max(tMin, t1);
    tMax = Math.min(tMax, t2);
    if (tMin > tMax) return Infinity;
  }
  if (Math.abs(dy) < 1e-9) {
    if (y < r.y || y > r.y + r.h) return Infinity;
  } else {
    let t1 = (r.y - y) / dy;
    let t2 = (r.y + r.h - y) / dy;
    if (t1 > t2) { const t = t1; t1 = t2; t2 = t; }
    tMin = Math.max(tMin, t1);
    tMax = Math.min(tMax, t2);
    if (tMin > tMax) return Infinity;
  }
  return tMin;
}

// The visible outline of a guard's cone: fan of rays clipped by solids.
export function conePolygon(guard, solids) {
  const rays = 20;
  const pts = [{ x: guard.x, y: guard.y }];
  for (let i = 0; i <= rays; i++) {
    const ang = guard.angle - GUARD.coneHalfAngle + (2 * GUARD.coneHalfAngle * i) / rays;
    const dx = Math.cos(ang);
    const dy = Math.sin(ang);
    let d = GUARD.coneRange;
    for (const s of solids) {
      const t = rayEntersRect(guard.x, guard.y, dx, dy, s, GUARD.coneRange);
      if (t < d) d = t;
    }
    pts.push({ x: guard.x + dx * d, y: guard.y + dy * d });
  }
  return pts;
}

function traceConeOutline(ctx, pts) {
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.closePath();
}

// Wall-sconce anchors along the top and bottom hall frames; each throws a
// warm pool of lamplight a little way into the hall.
function sconcePositions() {
  const xs = [170, 470, 770, 1070];
  const pools = [];
  for (const dx of xs) {
    pools.push({ x: FLOOR.x + dx, y: FLOOR.y + 30, fixtureY: FLOOR.y - 9 });
    pools.push({ x: FLOOR.x + dx, y: FLOOR.y + FLOOR.h - 30, fixtureY: FLOOR.y + FLOOR.h + 9 });
  }
  return pools;
}

function drawGiltPaintings(ctx) {
  // Miniature gilt-framed landscapes set into the hall's frame bands.
  const art = (x, y, w, h) => {
    ctx.fillStyle = PALETTE.brass;
    ctx.fillRect(x, y, w, h);
    const horiz = w >= h;
    const g = horiz
      ? ctx.createLinearGradient(x, y, x, y + h)
      : ctx.createLinearGradient(x, y, x + w, y);
    g.addColorStop(0, '#7d94c4');
    g.addColorStop(0.55, '#c47d4e');
    g.addColorStop(1, '#31456e');
    ctx.fillStyle = g;
    ctx.fillRect(x + 2, y + 2, w - 4, h - 4);
    ctx.fillStyle = 'rgba(20, 26, 48, 0.8)';
    if (horiz) ctx.fillRect(x + w * 0.55, y + h * 0.45, w * 0.3, h * 0.55);
    else ctx.fillRect(x + w * 0.45, y + h * 0.55, w * 0.55, h * 0.3);
  };
  for (const dx of [170, 470, 770, 1070]) {
    art(FLOOR.x + dx - 28, FLOOR.y - 15, 56, 12);
    art(FLOOR.x + dx - 28, FLOOR.y + FLOOR.h + 3, 56, 12);
  }
  for (const dy of [180, 480]) {
    art(FLOOR.x - 15, FLOOR.y + dy, 12, 56);
    art(FLOOR.x + FLOOR.w + 3, FLOOR.y + dy, 12, 56);
  }
}

function drawShadowCarpets(ctx, level) {
  // The shadow zones: deep velvet carpets with a crimson band and gilt edge.
  // Dark heart, readable rim — safe ground you can read at a glance.
  for (const s of level.shadows) {
    ctx.fillStyle = PALETTE.carpetBand;
    ctx.fillRect(s.x, s.y, s.w, s.h);
    ctx.fillStyle = PALETTE.carpet;
    ctx.fillRect(s.x + 6, s.y + 6, s.w - 12, s.h - 12);
    ctx.strokeStyle = PALETTE.carpetEdge;
    ctx.lineWidth = 2;
    ctx.strokeRect(s.x + 2, s.y + 2, s.w - 4, s.h - 4);
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(242, 193, 78, 0.16)';
    ctx.strokeRect(s.x + 11, s.y + 11, s.w - 22, s.h - 22);
    ctx.fillStyle = 'rgba(242, 193, 78, 0.10)';
    for (let dx = 24; dx < s.w - 12; dx += 30) {
      for (let dy = 24; dy < s.h - 12; dy += 30) {
        ctx.save();
        ctx.translate(s.x + dx, s.y + dy);
        ctx.rotate(Math.PI / 4);
        ctx.fillRect(-2.5, -2.5, 5, 5);
        ctx.restore();
      }
    }
  }
}

function drawMarbleFloor(ctx, level, time) {
  // Marble tiles: alternating cool tones, a whisper of variation, dark grout.
  const cell = 60;
  ctx.fillStyle = PALETTE.floorAlt;
  ctx.fillRect(FLOOR.x, FLOOR.y, FLOOR.w, FLOOR.h);
  for (let gx = 0; gx < FLOOR.w / cell; gx++) {
    for (let gy = 0; gy < FLOOR.h / cell; gy++) {
      const even = (gx + gy) % 2 === 0;
      const vein = (gx * 7 + gy * 13) % 6 === 0;
      ctx.fillStyle = even ? PALETTE.floor : PALETTE.floorAlt;
      ctx.fillRect(FLOOR.x + gx * cell, FLOOR.y + gy * cell, cell, cell);
      if (vein) {
        ctx.strokeStyle = 'rgba(190, 205, 240, 0.07)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(FLOOR.x + gx * cell + 8, FLOOR.y + gy * cell + cell - 10);
        ctx.lineTo(FLOOR.x + gx * cell + cell * 0.55, FLOOR.y + gy * cell + 14);
        ctx.lineTo(FLOOR.x + gx * cell + cell - 12, FLOOR.y + gy * cell + 30);
        ctx.stroke();
      }
    }
  }
  ctx.strokeStyle = PALETTE.floorLine;
  ctx.lineWidth = 1;
  for (let gx = 0; gx <= FLOOR.w / cell; gx++) {
    ctx.beginPath();
    ctx.moveTo(FLOOR.x + gx * cell + 0.5, FLOOR.y);
    ctx.lineTo(FLOOR.x + gx * cell + 0.5, FLOOR.y + FLOOR.h);
    ctx.stroke();
  }
  for (let gy = 0; gy <= FLOOR.h / cell; gy++) {
    ctx.beginPath();
    ctx.moveTo(FLOOR.x, FLOOR.y + gy * cell + 0.5);
    ctx.lineTo(FLOOR.x + FLOOR.w, FLOOR.y + gy * cell + 0.5);
    ctx.stroke();
  }

  drawShadowCarpets(ctx, level);

  // Hall frame: wall bands with a wainscot shadow and a brass chair rail,
  // gilt paintings, and the little brass sconce fixtures.
  ctx.fillStyle = PALETTE.wallTop;
  ctx.fillRect(FLOOR.x - 18, FLOOR.y - 18, FLOOR.w + 36, 18);
  ctx.fillRect(FLOOR.x - 18, FLOOR.y + FLOOR.h, FLOOR.w + 36, 18);
  ctx.fillRect(FLOOR.x - 18, FLOOR.y, 18, FLOOR.h);
  ctx.fillRect(FLOOR.x + FLOOR.w, FLOOR.y, 18, FLOOR.h);
  ctx.fillStyle = PALETTE.wallSide;
  ctx.fillRect(FLOOR.x - 18, FLOOR.y + FLOOR.h, FLOOR.w + 36, 5);
  ctx.fillRect(FLOOR.x - 18, FLOOR.y - 18, FLOOR.w + 36, 4);
  ctx.fillStyle = PALETTE.brass;
  ctx.fillRect(FLOOR.x - 18, FLOOR.y - 2, FLOOR.w + 36, 2);
  ctx.fillRect(FLOOR.x - 18, FLOOR.y + FLOOR.h, FLOOR.w + 36, 2);
  drawGiltPaintings(ctx);
  for (const s of sconcePositions()) {
    ctx.fillStyle = PALETTE.brass;
    ctx.fillRect(s.x - 6, s.fixtureY - 3, 12, 6);
    ctx.fillStyle = '#ffd9a0';
    ctx.fillRect(s.x - 2, s.fixtureY - 2, 4, 4);
  }

  drawExitDoor(ctx, level, time);
}

function drawExitDoor(ctx, level, time) {
  const e = level.exit;
  const pulse = 0.65 + 0.35 * Math.sin(time * 3);
  ctx.save();
  ctx.fillStyle = 'rgba(24, 74, 48, 0.95)';
  ctx.fillRect(e.x, e.y, e.w, e.h);
  ctx.strokeStyle = PALETTE.brass;
  ctx.lineWidth = 2;
  ctx.strokeRect(e.x + 1, e.y + 1, e.w - 2, e.h - 2);
  ctx.strokeStyle = `rgba(90, 255, 170, ${0.55 + 0.4 * pulse})`;
  ctx.lineWidth = 2;
  ctx.strokeRect(e.x + 5, e.y + 5, e.w - 10, e.h - 10);
  ctx.fillStyle = PALETTE.brassBright;
  ctx.beginPath();
  ctx.arc(e.x + e.w / 2, e.y + 14, 3, 0, Math.PI * 2);
  ctx.arc(e.x + e.w / 2, e.y + e.h - 14, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#baffdc';
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('EXIT', e.x + e.w / 2, e.y + e.h / 2 + 5);
  ctx.restore();
}

function drawDisplayCase(ctx, p) {
  // Plinth and body, a pedestal inside, the golden piece, then glass with a
  // diagonal sheen and brass corner brackets over the top.
  ctx.fillStyle = PALETTE.caseBody;
  ctx.fillRect(p.x, p.y, p.w, p.h);
  ctx.fillStyle = 'rgba(10, 14, 28, 0.55)';
  ctx.fillRect(p.x + 6, p.y + 6, p.w - 12, p.h - 12);
  ctx.fillStyle = '#7c88a8';
  ctx.fillRect(p.x + p.w / 2 - 11, p.y + p.h - 16, 22, 7);
  ctx.save();
  ctx.translate(p.x + p.w / 2, p.y + p.h / 2 - 2);
  ctx.rotate(Math.PI / 4);
  ctx.fillStyle = PALETTE.gold;
  ctx.fillRect(-6, -6, 12, 12);
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.fillRect(-6, -6, 5, 5);
  ctx.restore();
  ctx.fillStyle = PALETTE.caseGlass;
  ctx.fillRect(p.x + 4, p.y + 4, p.w - 8, p.h - 8);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.10)';
  ctx.beginPath();
  ctx.moveTo(p.x + 10, p.y + p.h - 5);
  ctx.lineTo(p.x + p.w * 0.45, p.y + 5);
  ctx.lineTo(p.x + p.w * 0.62, p.y + 5);
  ctx.lineTo(p.x + 24, p.y + p.h - 5);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = PALETTE.caseTrim;
  ctx.lineWidth = 2;
  ctx.strokeRect(p.x + 1, p.y + 1, p.w - 2, p.h - 2);
  ctx.fillStyle = PALETTE.brassBright;
  for (const [cx, cy] of [[p.x + 4, p.y + 4], [p.x + p.w - 4, p.y + 4], [p.x + 4, p.y + p.h - 4], [p.x + p.w - 4, p.y + p.h - 4]]) {
    ctx.fillRect(cx - 1.5, cy - 1.5, 3, 3);
  }
}

function drawStonePillar(ctx, p) {
  ctx.fillStyle = PALETTE.wallSide;
  ctx.fillRect(p.x, p.y, p.w, p.h);
  ctx.fillStyle = PALETTE.pillarTop;
  ctx.beginPath();
  ctx.arc(p.x + p.w / 2, p.y + p.h / 2, p.w / 2 - 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = PALETTE.brass;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(p.x + p.w / 2, p.y + p.h / 2, p.w / 2 - 4, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = PALETTE.pillar;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(p.x + p.w / 2, p.y + p.h / 2, p.w / 2 - 10, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = PALETTE.pillarTop;
  ctx.beginPath();
  ctx.arc(p.x + p.w / 2, p.y + p.h / 2, 5, 0, Math.PI * 2);
  ctx.fill();
}

function drawWoodenCrate(ctx, p) {
  ctx.fillStyle = PALETTE.crate;
  ctx.fillRect(p.x, p.y, p.w, p.h);
  ctx.strokeStyle = PALETTE.crateEdge;
  ctx.lineWidth = 3;
  ctx.strokeRect(p.x + 2, p.y + 2, p.w - 4, p.h - 4);
  ctx.beginPath();
  ctx.moveTo(p.x + 3, p.y + 3);
  ctx.lineTo(p.x + p.w - 3, p.y + p.h - 3);
  ctx.moveTo(p.x + p.w - 3, p.y + 3);
  ctx.lineTo(p.x + 3, p.y + p.h - 3);
  ctx.stroke();
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.fillRect(p.x, p.y + p.h - 6, p.w, 6);
}

function drawLeafyPlanter(ctx, p) {
  ctx.fillStyle = PALETTE.planter;
  ctx.fillRect(p.x, p.y, p.w, p.h);
  ctx.strokeStyle = PALETTE.brass;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(p.x + 1, p.y + 1, p.w - 2, p.h - 2);
  ctx.fillStyle = PALETTE.planterLeaf;
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.arc(p.x + 12 + i * ((p.w - 24) / 4), p.y + p.h / 2 + (i % 2 === 0 ? -3 : 3), 10, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = 'rgba(160, 230, 150, 0.35)';
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.arc(p.x + 9 + i * ((p.w - 24) / 4), p.y + p.h / 2 - 6 + (i % 2 === 0 ? -3 : 3), 4, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawProp(ctx, p) {
  ctx.save();
  if (p.kind === 'case') drawDisplayCase(ctx, p);
  else if (p.kind === 'pillar') drawStonePillar(ctx, p);
  else if (p.kind === 'crate') drawWoodenCrate(ctx, p);
  else if (p.kind === 'planter') drawLeafyPlanter(ctx, p);
  else {
    ctx.fillStyle = PALETTE.wall;
    ctx.fillRect(p.x, p.y, p.w, p.h);
    ctx.fillStyle = PALETTE.wallTop;
    ctx.fillRect(p.x, p.y, p.w, 5);
  }
  ctx.restore();
}

function drawWallBlock(ctx, w) {
  // Wall with a wainscot shadow below a brass chair rail, so even plain
  // cover reads as museum architecture.
  ctx.fillStyle = PALETTE.wall;
  ctx.fillRect(w.x, w.y, w.w, w.h);
  ctx.fillStyle = PALETTE.wallSide;
  if (w.w >= w.h) {
    ctx.fillRect(w.x, w.y + w.h - 6, w.w, 6);
    ctx.fillStyle = PALETTE.brass;
    ctx.fillRect(w.x, w.y + w.h - 8, w.w, 2);
    ctx.fillStyle = PALETTE.wallTop;
    ctx.fillRect(w.x, w.y, w.w, 4);
  } else {
    ctx.fillRect(w.x + w.w - 6, w.y, 6, w.h);
    ctx.fillStyle = PALETTE.brass;
    ctx.fillRect(w.x + w.w - 8, w.y, 2, w.h);
    ctx.fillStyle = PALETTE.wallTop;
    ctx.fillRect(w.x, w.y, 4, w.h);
  }
}

function drawSparkle(ctx, x, y, r, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = '#dff6ff';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(x - r, y);
  ctx.lineTo(x + r, y);
  ctx.moveTo(x, y - r);
  ctx.lineTo(x, y + r);
  ctx.stroke();
  ctx.restore();
}

function drawMoonGemAndLoot(ctx, game) {
  const { level, taken, time } = game;
  if (!taken.gem) {
    const g = level.gem;
    // Stepped pedestal with brass trim.
    ctx.fillStyle = '#66738f';
    ctx.fillRect(g.x - 19, g.y + 9, 38, 9);
    ctx.fillStyle = '#7c88a8';
    ctx.fillRect(g.x - 15, g.y + 3, 30, 8);
    ctx.fillStyle = PALETTE.brass;
    ctx.fillRect(g.x - 19, g.y + 8, 38, 2);
    // Glow + floating gem with facets and twinkling sparkles.
    const bob = Math.sin(time * 2.2) * 3;
    const gy = g.y - 8 + bob;
    const glow = ctx.createRadialGradient(g.x, gy, 2, g.x, gy, 40);
    glow.addColorStop(0, PALETTE.gemGlow);
    glow.addColorStop(1, 'rgba(140, 225, 255, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(g.x - 42, gy - 42, 84, 84);
    ctx.save();
    ctx.translate(g.x, gy);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = PALETTE.gem;
    ctx.fillRect(-9, -9, 18, 18);
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.fillRect(-9, -9, 8, 8);
    ctx.strokeStyle = 'rgba(20, 60, 90, 0.55)';
    ctx.lineWidth = 1;
    ctx.strokeRect(-9, -9, 18, 18);
    ctx.beginPath();
    ctx.moveTo(-9, 0);
    ctx.lineTo(9, 0);
    ctx.moveTo(0, -9);
    ctx.lineTo(0, 9);
    ctx.stroke();
    ctx.restore();
    drawSparkle(ctx, g.x - 20, gy - 12, 5 + Math.sin(time * 3.1) * 1.6, 0.55 + 0.4 * Math.sin(time * 3.1));
    drawSparkle(ctx, g.x + 22, gy + 4, 4 + Math.cos(time * 2.6) * 1.4, 0.5 + 0.4 * Math.cos(time * 2.6));
    drawSparkle(ctx, g.x + 4, gy - 24, 3.4, 0.45 + 0.35 * Math.sin(time * 3.7 + 2));
  }
  level.loots.forEach((loot, i) => {
    if (taken.loots.has(i)) return;
    ctx.fillStyle = '#5d6884';
    ctx.fillRect(loot.x - 11, loot.y + 5, 22, 7);
    ctx.fillStyle = PALETTE.brass;
    ctx.fillRect(loot.x - 11, loot.y + 4, 22, 1.6);
    ctx.save();
    ctx.translate(loot.x, loot.y - 2);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = PALETTE.gold;
    ctx.fillRect(-6, -6, 12, 12);
    ctx.restore();
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fillRect(loot.x - 2, loot.y - 5, 3, 3);
  });
}

function drawVelvet(ctx, p, time) {
  ctx.save();
  ctx.translate(p.x, p.y);
  // Soft shadow.
  ctx.fillStyle = 'rgba(0,0,0,0.38)';
  ctx.beginPath();
  ctx.ellipse(0, 9, 13, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.rotate(p.angle);
  const sneaking = p.gait === 'sneak';
  // Striped tail, trailing behind and swaying as she moves.
  const sway = Math.sin(time * (p.moving ? 7 : 2.2)) * (sneaking ? 2 : 4);
  ctx.strokeStyle = PALETTE.playerCoat;
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-10, 0);
  ctx.quadraticCurveTo(-19, sway, -25, sway * 1.7 + 2);
  ctx.stroke();
  ctx.strokeStyle = PALETTE.playerScarf;
  ctx.lineWidth = 5;
  for (const t of [0.45, 0.75]) {
    const qx = -10 - 15 * t;
    const qy = sway * (t + t * t) + 2 * t;
    ctx.beginPath();
    ctx.moveTo(qx - 2, qy - 2.5);
    ctx.lineTo(qx + 1, qy + 2.5);
    ctx.stroke();
  }
  ctx.lineCap = 'butt';
  if (sneaking) ctx.transform(1.05, 0, 0, 0.8, 0, 3);
  // Cat ears on the hood.
  ctx.fillStyle = PALETTE.playerCoat;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(-3, side * 9 - 3);
    ctx.lineTo(-11, side * 14);
    ctx.lineTo(2, side * 11);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#2a1c47';
    ctx.beginPath();
    ctx.moveTo(-4, side * 8.4 - 2);
    ctx.lineTo(-8.6, side * 11.4);
    ctx.lineTo(0, side * 9.6);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = PALETTE.playerCoat;
  }
  // Hooded body.
  ctx.fillStyle = PALETTE.playerCoat;
  ctx.beginPath();
  ctx.arc(0, 0, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.25)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(0, 0, 12.4, 0, Math.PI * 2);
  ctx.stroke();
  // Velvet-red scarf: a band at the neck and a loose end fluttering behind.
  ctx.fillStyle = PALETTE.playerScarf;
  ctx.beginPath();
  ctx.moveTo(-6, -3.4);
  ctx.lineTo(-13 - Math.sin(time * 5) * 1.6, 0);
  ctx.lineTo(-6, 3.4);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = PALETTE.playerScarf;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(0, 0, 9.5, -0.9, 0.9);
  ctx.stroke();
  // Face in shadow, amber eyes.
  ctx.fillStyle = '#241a33';
  ctx.beginPath();
  ctx.arc(5, 0, 6.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffe9a8';
  ctx.fillRect(7, -3.4, 2.4, 2.4);
  ctx.fillRect(7, 1.2, 2.4, 2.4);
  ctx.restore();
  if (p.gait === 'run' && p.moving) {
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.10)';
    ctx.lineWidth = 2;
    const r = 26 + (time * 60) % 30;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

function drawMuseumGuard(ctx, g) {
  ctx.save();
  ctx.translate(g.x, g.y);
  ctx.fillStyle = 'rgba(0,0,0,0.38)';
  ctx.beginPath();
  ctx.ellipse(0, 10, 14, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.rotate(g.angle);
  // Navy uniform body with a darker back.
  ctx.fillStyle = PALETTE.guardBody;
  ctx.beginPath();
  ctx.arc(0, 0, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PALETTE.guardDark;
  ctx.beginPath();
  ctx.arc(0, 0, 14, Math.PI * 0.6, Math.PI * 1.4);
  ctx.fill();
  // Brass buttons down the chest.
  ctx.fillStyle = PALETTE.brassBright;
  ctx.beginPath();
  ctx.arc(4.5, -3.4, 1.5, 0, Math.PI * 2);
  ctx.arc(4.5, 3.4, 1.5, 0, Math.PI * 2);
  ctx.fill();
  // Belt.
  ctx.strokeStyle = 'rgba(10, 12, 24, 0.65)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 0, 10.5, -0.5, 0.5);
  ctx.stroke();
  // Face.
  ctx.fillStyle = PALETTE.guardSkin;
  ctx.beginPath();
  ctx.arc(6, 0, 6.5, 0, Math.PI * 2);
  ctx.fill();
  // Cap with brass badge and a brim toward facing.
  ctx.fillStyle = PALETTE.guardDark;
  ctx.beginPath();
  ctx.arc(4, 0, 7.5, -Math.PI / 2, Math.PI / 2);
  ctx.fill();
  ctx.fillRect(6, -2.5, 7, 5);
  ctx.fillStyle = PALETTE.brassBright;
  ctx.beginPath();
  ctx.arc(5.5, 0, 1.7, 0, Math.PI * 2);
  ctx.fill();
  // Flashlight: dark body, bright lens at the cone's origin.
  ctx.fillStyle = '#232838';
  ctx.fillRect(11, -3, 6, 6);
  ctx.fillStyle = '#fff3c4';
  ctx.fillRect(15.5, -2, 2.4, 4);
  ctx.restore();
}

function coneTintColor(g) {
  const mood = guardMood(g);
  if (mood === 'alarmed') return [255, 84, 66];
  if (g.meter > 0.6) return [255, 140, 60];
  if (mood === 'wary') return [255, 190, 80];
  return [255, 226, 150];
}

function drawLighting(ctx, game) {
  const { guards, player, level, taken, solids, time } = game;
  const lc = createLamplightLayer(ctx.canvas.width, ctx.canvas.height);
  lc.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  // Behind the title the hall stays brighter, so the cover shows the real
  // level, guards and cones under the story panel.
  const darkness = game.mode === 'title' ? 0.46 : 0.82;
  lc.fillStyle = `rgba(4, 6, 16, ${darkness})`;
  lc.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  lc.globalCompositeOperation = 'destination-out';

  const cut = (x, y, r, strength) => {
    const grad = lc.createRadialGradient(x, y, 2, x, y, r);
    grad.addColorStop(0, `rgba(0,0,0,${strength})`);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    lc.fillStyle = grad;
    lc.fillRect(x - r, y - r, r * 2, r * 2);
  };

  // Lamplight pools first: soft islands of safety along both walls.
  for (const s of sconcePositions()) cut(s.x, s.y, 128, 0.5);

  for (const g of guards) {
    const pts = conePolygon(g, solids);
    const grad = lc.createRadialGradient(g.x, g.y, 8, g.x, g.y, GUARD.coneRange);
    grad.addColorStop(0, 'rgba(0,0,0,0.96)');
    grad.addColorStop(0.7, 'rgba(0,0,0,0.75)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    lc.fillStyle = grad;
    traceConeOutline(lc, pts);
    lc.fill();
  }
  cut(player.x, player.y, 56, 0.55);
  if (!taken.gem) cut(level.gem.x, level.gem.y, 48, 0.5);
  cut(level.exit.x + level.exit.w / 2, level.exit.y + level.exit.h / 2, 62, 0.45);

  lc.globalCompositeOperation = 'source-over';
  ctx.drawImage(lightCanvas, 0, 0);

  // Warm tint: lamplight pools glow amber, cones tint by suspicion.
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const s of sconcePositions()) {
    const grad = ctx.createRadialGradient(s.x, s.y, 4, s.x, s.y, 128);
    grad.addColorStop(0, 'rgba(255, 180, 94, 0.10)');
    grad.addColorStop(1, 'rgba(255, 180, 94, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(s.x - 128, s.y - 128, 256, 256);
  }
  for (const g of guards) {
    const [r, gg, b] = coneTintColor(g);
    const strength = guardMood(g) === 'alarmed' ? 0.32 : 0.2;
    const pts = conePolygon(g, solids);
    const grad = ctx.createRadialGradient(g.x, g.y, 8, g.x, g.y, GUARD.coneRange);
    grad.addColorStop(0, `rgba(${r},${gg},${b},${strength})`);
    grad.addColorStop(1, `rgba(${r},${gg},${b},0)`);
    ctx.fillStyle = grad;
    traceConeOutline(ctx, pts);
    ctx.fill();
    // A brighter leading edge, so the cone's reach reads instantly.
    ctx.strokeStyle = `rgba(${r},${gg},${b},0.38)`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(pts[1].x, pts[1].y);
    for (let i = 2; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.stroke();
  }
  ctx.restore();
}

function drawDustMotes(ctx, game) {
  // Dust drifting through the lamplight: tiny warm specks, densest inside
  // the sconce pools, twinkling as they turn.
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const pools = sconcePositions();
  for (let i = 0; i < 46; i++) {
    const pool = pools[i % pools.length];
    const bx = pool.x + ((i * 67) % 150) - 75;
    const by = pool.y + ((i * 41) % 110) - 55;
    const x = bx + Math.sin(game.time * 0.4 + i * 1.7) * 7;
    const y = by + Math.sin(game.time * 0.27 + i * 2.3) * 6;
    const tw = 0.5 + 0.5 * Math.sin(game.time * 1.4 + i * 3.1);
    ctx.fillStyle = `rgba(255, 214, 150, ${0.05 + 0.1 * tw})`;
    ctx.beginPath();
    ctx.arc(x, y, i % 3 === 0 ? 1.8 : 1.1, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawVignette(ctx) {
  const { width, height } = ctx.canvas;
  const grad = ctx.createRadialGradient(
    width / 2, height / 2, Math.min(width, height) * 0.42,
    width / 2, height / 2, Math.max(width, height) * 0.72,
  );
  grad.addColorStop(0, 'rgba(2, 3, 8, 0)');
  grad.addColorStop(1, 'rgba(2, 3, 8, 0.40)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);
}

function drawGuardIndicators(ctx, game) {
  const { guards } = game;
  for (const g of guards) {
    const mood = guardMood(g);
    if (g.meter > 0.02 && g.state !== 'chase') {
      const w = 36;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(g.x - w / 2, g.y - 34, w, 7);
      ctx.strokeStyle = PALETTE.brass;
      ctx.lineWidth = 1;
      ctx.strokeRect(g.x - w / 2 + 0.5, g.y - 34 + 0.5, w - 1, 6);
      const [r, gg, b] = coneTintColor(g);
      ctx.fillStyle = `rgb(${r},${gg},${b})`;
      ctx.fillRect(g.x - w / 2 + 2, g.y - 32.5, (w - 4) * clamp(g.meter, 0, 1), 4);
    }
    if (mood === 'wary' || mood === 'alarmed') {
      // The ? / ! rides on a little brass plaque, like the museum's labels.
      const label = mood === 'wary' ? '?' : '!';
      const px = g.x;
      const py = g.y - 52;
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath();
      ctx.roundRect(px - 11, py - 10 + 2, 22, 22, 5);
      ctx.fill();
      const grad = ctx.createLinearGradient(px, py - 10, px, py + 12);
      grad.addColorStop(0, PALETTE.brassBright);
      grad.addColorStop(1, PALETTE.brass);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(px - 11, py - 10, 22, 22, 5);
      ctx.fill();
      ctx.strokeStyle = '#6e5514';
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.fillStyle = mood === 'alarmed' ? '#7d1610' : '#3d2f05';
      ctx.font = 'bold 16px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText(label, px, py + 6);
      ctx.restore();
    }
  }
}

export function drawScene(ctx, game) {
  ctx.fillStyle = '#070a16';
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  drawMarbleFloor(ctx, game.level, game.time);
  drawMoonGemAndLoot(ctx, game);
  for (const p of game.level.props) drawProp(ctx, p);
  for (const w of game.level.walls) drawWallBlock(ctx, w);
  drawVelvet(ctx, game.player, game.time);
  for (const g of game.guards) drawMuseumGuard(ctx, g);
  drawLighting(ctx, game);
  drawDustMotes(ctx, game);
  drawVignette(ctx);
  drawGuardIndicators(ctx, game);
}
