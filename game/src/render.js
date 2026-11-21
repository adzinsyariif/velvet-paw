// render.js — all canvas drawing for the play scene: the hall, its cover and
// carpets, the actors, and the flashlight lighting. A darkness overlay is
// punched through by each guard's cone (raycast against the solids, so walls
// and cases genuinely block light), by the gem, the exit and Velvet herself.

import { PALETTE, GUARD, clamp } from './config.js';
import { FLOOR } from './levels.js';
import { guardMood } from './guards.js';

let lightCanvas = null;
let lightCtx = null;

function getLightLayer(w, h) {
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
function rayRectT(x, y, dx, dy, r, maxDist) {
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
  const rays = 16;
  const pts = [{ x: guard.x, y: guard.y }];
  for (let i = 0; i <= rays; i++) {
    const ang = guard.angle - GUARD.coneHalfAngle + (2 * GUARD.coneHalfAngle * i) / rays;
    const dx = Math.cos(ang);
    const dy = Math.sin(ang);
    let d = GUARD.coneRange;
    for (const s of solids) {
      const t = rayRectT(guard.x, guard.y, dx, dy, s, GUARD.coneRange);
      if (t < d) d = t;
    }
    pts.push({ x: guard.x + dx * d, y: guard.y + dy * d });
  }
  return pts;
}

function tracePath(ctx, pts) {
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.closePath();
}

function drawFloor(ctx, level, time) {
  ctx.fillStyle = PALETTE.floor;
  ctx.fillRect(FLOOR.x, FLOOR.y, FLOOR.w, FLOOR.h);
  // Subtle marble checker so movement reads against the ground.
  const cell = 40;
  ctx.fillStyle = PALETTE.floorAlt;
  for (let gx = 0; gx < FLOOR.w / cell; gx++) {
    for (let gy = 0; gy < FLOOR.h / cell; gy++) {
      if ((gx + gy) % 2 === 0) ctx.fillRect(FLOOR.x + gx * cell, FLOOR.y + gy * cell, cell, cell);
    }
  }
  ctx.strokeStyle = PALETTE.floorLine;
  ctx.lineWidth = 1;
  ctx.strokeRect(FLOOR.x + 0.5, FLOOR.y + 0.5, FLOOR.w - 1, FLOOR.h - 1);

  // Carpets: the shadow zones.
  for (const s of level.shadows) {
    ctx.fillStyle = PALETTE.carpet;
    ctx.fillRect(s.x, s.y, s.w, s.h);
    ctx.strokeStyle = PALETTE.carpetEdge;
    ctx.lineWidth = 3;
    ctx.strokeRect(s.x + 2, s.y + 2, s.w - 4, s.h - 4);
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.strokeRect(s.x + 9, s.y + 9, s.w - 18, s.h - 18);
  }

  // Hall frame.
  ctx.fillStyle = PALETTE.wallTop;
  ctx.fillRect(FLOOR.x - 18, FLOOR.y - 18, FLOOR.w + 36, 18);
  ctx.fillRect(FLOOR.x - 18, FLOOR.y + FLOOR.h, FLOOR.w + 36, 18);
  ctx.fillRect(FLOOR.x - 18, FLOOR.y, 18, FLOOR.h);
  ctx.fillRect(FLOOR.x + FLOOR.w, FLOOR.y, 18, FLOOR.h);
  ctx.fillStyle = PALETTE.wallSide;
  ctx.fillRect(FLOOR.x - 18, FLOOR.y + FLOOR.h, FLOOR.w + 36, 5);

  drawExit(ctx, level, time);
}

function drawExit(ctx, level, time) {
  const e = level.exit;
  const pulse = 0.65 + 0.35 * Math.sin(time * 3);
  ctx.save();
  ctx.fillStyle = 'rgba(30, 90, 60, 0.9)';
  ctx.fillRect(e.x, e.y, e.w, e.h);
  ctx.strokeStyle = `rgba(90, 255, 170, ${0.55 + 0.4 * pulse})`;
  ctx.lineWidth = 3;
  ctx.strokeRect(e.x + 2, e.y + 2, e.w - 4, e.h - 4);
  ctx.fillStyle = PALETTE.exitGlow;
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('EXIT', e.x + e.w / 2, e.y + e.h / 2 + 5);
  ctx.restore();
}

function drawProp(ctx, p) {
  ctx.save();
  if (p.kind === 'case') {
    ctx.fillStyle = PALETTE.caseBody;
    ctx.fillRect(p.x, p.y, p.w, p.h);
    ctx.fillStyle = PALETTE.caseGlass;
    ctx.fillRect(p.x + 6, p.y + 6, p.w - 12, p.h - 12);
    ctx.strokeStyle = PALETTE.caseTrim;
    ctx.lineWidth = 2;
    ctx.strokeRect(p.x + 1, p.y + 1, p.w - 2, p.h - 2);
    ctx.fillStyle = PALETTE.gold;
    ctx.save();
    ctx.translate(p.x + p.w / 2, p.y + p.h / 2);
    ctx.rotate(Math.PI / 4);
    ctx.fillRect(-6, -6, 12, 12);
    ctx.restore();
  } else if (p.kind === 'pillar') {
    ctx.fillStyle = PALETTE.wallSide;
    ctx.fillRect(p.x, p.y, p.w, p.h);
    ctx.fillStyle = PALETTE.pillarTop;
    ctx.beginPath();
    ctx.arc(p.x + p.w / 2, p.y + p.h / 2, p.w / 2 - 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = PALETTE.pillar;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(p.x + p.w / 2, p.y + p.h / 2, p.w / 2 - 8, 0, Math.PI * 2);
    ctx.stroke();
  } else if (p.kind === 'crate') {
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
  } else if (p.kind === 'planter') {
    ctx.fillStyle = PALETTE.planter;
    ctx.fillRect(p.x, p.y, p.w, p.h);
    ctx.fillStyle = PALETTE.planterLeaf;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.arc(p.x + 14 + i * ((p.w - 28) / 3), p.y + p.h / 2, 10, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    ctx.fillStyle = PALETTE.wall;
    ctx.fillRect(p.x, p.y, p.w, p.h);
    ctx.fillStyle = PALETTE.wallTop;
    ctx.fillRect(p.x, p.y, p.w, 5);
  }
  ctx.restore();
}

function drawWallBlock(ctx, w) {
  ctx.fillStyle = PALETTE.wall;
  ctx.fillRect(w.x, w.y, w.w, w.h);
  ctx.fillStyle = PALETTE.wallTop;
  if (w.w >= w.h) ctx.fillRect(w.x, w.y, w.w, 5);
  else ctx.fillRect(w.x, w.y, 5, w.h);
  ctx.fillStyle = PALETTE.wallSide;
  if (w.w >= w.h) ctx.fillRect(w.x, w.y + w.h - 5, w.w, 5);
  else ctx.fillRect(w.x + w.w - 5, w.y, 5, w.h);
}

function drawGemAndLoot(ctx, game) {
  const { level, taken, time } = game;
  if (!taken.gem) {
    const g = level.gem;
    // Pedestal.
    ctx.fillStyle = '#7c88a8';
    ctx.fillRect(g.x - 16, g.y + 6, 32, 12);
    ctx.fillStyle = '#98a5c2';
    ctx.fillRect(g.x - 20, g.y + 2, 40, 7);
    // Glow + floating gem.
    const bob = Math.sin(time * 2.2) * 3;
    const glow = ctx.createRadialGradient(g.x, g.y - 6 + bob, 2, g.x, g.y - 6 + bob, 34);
    glow.addColorStop(0, PALETTE.gemGlow);
    glow.addColorStop(1, 'rgba(140, 225, 255, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(g.x - 36, g.y - 44 + bob, 72, 72);
    ctx.save();
    ctx.translate(g.x, g.y - 8 + bob);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = PALETTE.gem;
    ctx.fillRect(-9, -9, 18, 18);
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.fillRect(-9, -9, 8, 8);
    ctx.restore();
  }
  level.loots.forEach((loot, i) => {
    if (taken.loots.has(i)) return;
    ctx.fillStyle = '#5d6884';
    ctx.fillRect(loot.x - 10, loot.y + 4, 20, 8);
    ctx.save();
    ctx.translate(loot.x, loot.y - 2);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = PALETTE.gold;
    ctx.fillRect(-6, -6, 12, 12);
    ctx.restore();
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.fillRect(loot.x - 2, loot.y - 4, 3, 3);
  });
}

function drawPlayer(ctx, p, time) {
  ctx.save();
  ctx.translate(p.x, p.y);
  // Soft shadow.
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(0, 9, 13, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.rotate(p.angle);
  const crouch = p.gait === 'sneak' ? 0.82 : 1;
  ctx.scale(1, crouch);
  // Cat ears on the hood.
  ctx.fillStyle = PALETTE.playerCoat;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(-3, side * 9 - 3);
    ctx.lineTo(-11, side * 14);
    ctx.lineTo(2, side * 11);
    ctx.closePath();
    ctx.fill();
  }
  // Hooded body.
  ctx.fillStyle = PALETTE.playerCoat;
  ctx.beginPath();
  ctx.arc(0, 0, 13, 0, Math.PI * 2);
  ctx.fill();
  // Teal scarf band.
  ctx.strokeStyle = PALETTE.playerTeal;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(0, 0, 9.5, -0.9, 0.9);
  ctx.stroke();
  // Face in shadow.
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

function drawGuard(ctx, g) {
  ctx.save();
  ctx.translate(g.x, g.y);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(0, 10, 14, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.rotate(g.angle);
  // Uniform body.
  ctx.fillStyle = PALETTE.guardBody;
  ctx.beginPath();
  ctx.arc(0, 0, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PALETTE.guardDark;
  ctx.beginPath();
  ctx.arc(0, 0, 14, Math.PI * 0.6, Math.PI * 1.4);
  ctx.fill();
  // Face.
  ctx.fillStyle = PALETTE.guardSkin;
  ctx.beginPath();
  ctx.arc(6, 0, 6.5, 0, Math.PI * 2);
  ctx.fill();
  // Cap with brim toward facing.
  ctx.fillStyle = PALETTE.guardDark;
  ctx.beginPath();
  ctx.arc(4, 0, 7.5, -Math.PI / 2, Math.PI / 2);
  ctx.fill();
  ctx.fillRect(6, -2.5, 7, 5);
  // Flashlight.
  ctx.fillStyle = '#d8dde8';
  ctx.fillRect(11, -3, 6, 6);
  ctx.restore();
}

function coneColor(g) {
  const mood = guardMood(g);
  if (mood === 'alarmed') return [255, 84, 66];
  if (g.meter > 0.6) return [255, 140, 60];
  if (mood === 'wary') return [255, 190, 80];
  return [255, 226, 150];
}

function drawLighting(ctx, game) {
  const { guards, player, level, taken, solids, time } = game;
  const lc = getLightLayer(ctx.canvas.width, ctx.canvas.height);
  lc.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  // Behind the title the hall stays brighter, so the cover shows the real
  // level, guards and cones under the story panel.
  const darkness = game.mode === 'title' ? 0.58 : 0.8;
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

  for (const g of guards) {
    const pts = conePolygon(g, solids);
    const grad = lc.createRadialGradient(g.x, g.y, 8, g.x, g.y, GUARD.coneRange);
    grad.addColorStop(0, 'rgba(0,0,0,0.96)');
    grad.addColorStop(0.7, 'rgba(0,0,0,0.75)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    lc.fillStyle = grad;
    tracePath(lc, pts);
    lc.fill();
  }
  cut(player.x, player.y, 52, 0.55);
  if (!taken.gem) cut(level.gem.x, level.gem.y, 46, 0.5);
  cut(level.exit.x + level.exit.w / 2, level.exit.y + level.exit.h / 2, 60, 0.45);

  lc.globalCompositeOperation = 'source-over';
  ctx.drawImage(lightCanvas, 0, 0);

  // Warm tint inside each cone, coloured by suspicion.
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const g of guards) {
    const [r, gg, b] = coneColor(g);
    const strength = guardMood(g) === 'alarmed' ? 0.32 : 0.2;
    const pts = conePolygon(g, solids);
    const grad = ctx.createRadialGradient(g.x, g.y, 8, g.x, g.y, GUARD.coneRange);
    grad.addColorStop(0, `rgba(${r},${gg},${b},${strength})`);
    grad.addColorStop(1, `rgba(${r},${gg},${b},0)`);
    ctx.fillStyle = grad;
    tracePath(ctx, pts);
    ctx.fill();
  }
  ctx.restore();
}

function drawIndicators(ctx, game) {
  const { guards } = game;
  for (const g of guards) {
    const mood = guardMood(g);
    if (g.meter > 0.02 && g.state !== 'chase') {
      const w = 34;
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(g.x - w / 2, g.y - 34, w, 6);
      const [r, gg, b] = coneColor(g);
      ctx.fillStyle = `rgb(${r},${gg},${b})`;
      ctx.fillRect(g.x - w / 2 + 1, g.y - 33, (w - 2) * clamp(g.meter, 0, 1), 4);
    }
    if (mood === 'wary') {
      ctx.fillStyle = PALETTE.warn;
      ctx.font = 'bold 22px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('?', g.x, g.y - 40);
    } else if (mood === 'alarmed') {
      ctx.fillStyle = PALETTE.danger;
      ctx.font = 'bold 24px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('!', g.x, g.y - 40);
    }
  }
}

export function drawScene(ctx, game) {
  ctx.fillStyle = '#070a16';
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  drawFloor(ctx, game.level, game.time);
  drawGemAndLoot(ctx, game);
  for (const p of game.level.props) drawProp(ctx, p);
  for (const w of game.level.walls) drawWallBlock(ctx, w);
  drawPlayer(ctx, game.player, game.time);
  for (const g of game.guards) drawGuard(ctx, g);
  drawLighting(ctx, game);
  drawIndicators(ctx, game);
}
