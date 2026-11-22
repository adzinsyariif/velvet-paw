// hud.js — the top bar (objective, loot, score, clock) and every full-screen
// overlay: title, pause, busted, level complete and victory. The play scene
// is always drawn underneath, so overlays read as glass over the museum.

import { PALETTE, HUD_H, VIEW } from './config.js';

function formatClock(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

// The museum's alarm eye: a brass emblem hanging below the top bar that
// opens and fills with the most-alert guard's meter — calm brass, amber
// when a guard is suspicious, wide and red at a full chase.
export function drawDetectionEye(ctx, game) {
  let maxMeter = 0;
  let anyChase = false;
  for (const g of game.guards) {
    if (g.meter > maxMeter) maxMeter = g.meter;
    if (g.state === 'chase') anyChase = true;
  }
  if (anyChase) maxMeter = 1;
  const cx = VIEW.w / 2;
  const cy = HUD_H + 30;
  const open = 0.35 + 0.65 * maxMeter;
  ctx.save();
  // Hanging mount from the bar.
  ctx.strokeStyle = PALETTE.brass;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx, HUD_H);
  ctx.lineTo(cx, cy - 13);
  ctx.stroke();
  ctx.fillStyle = PALETTE.brass;
  ctx.beginPath();
  ctx.arc(cx, cy - 14, 3, 0, Math.PI * 2);
  ctx.fill();
  // Almond outline.
  ctx.beginPath();
  ctx.moveTo(cx - 30, cy);
  ctx.quadraticCurveTo(cx, cy - 26 * open, cx + 30, cy);
  ctx.quadraticCurveTo(cx, cy + 26 * open, cx - 30, cy);
  ctx.closePath();
  ctx.fillStyle = 'rgba(8, 10, 20, 0.88)';
  ctx.fill();
  ctx.strokeStyle = PALETTE.brass;
  ctx.lineWidth = 2;
  ctx.stroke();
  // Iris fills with the meter; the pupil is Velvet's silhouette colour.
  const irisR = 6 + 5 * maxMeter;
  ctx.beginPath();
  ctx.arc(cx, cy, irisR, 0, Math.PI * 2);
  ctx.fillStyle = anyChase || maxMeter > 0.85
    ? PALETTE.danger
    : maxMeter >= 0.3
      ? PALETTE.warn
      : PALETTE.brass;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx, cy, irisR * 0.45, 0, Math.PI * 2);
  ctx.fillStyle = '#141021';
  ctx.fill();
  ctx.restore();
}

export function drawHud(ctx, game) {
  const { level } = game;
  ctx.fillStyle = 'rgba(5, 7, 15, 0.92)';
  ctx.fillRect(0, 0, VIEW.w, HUD_H);
  ctx.fillStyle = PALETTE.caseTrim;
  ctx.fillRect(0, HUD_H - 2, VIEW.w, 2);
  ctx.fillStyle = 'rgba(201, 162, 39, 0.45)';
  ctx.fillRect(0, HUD_H - 5, VIEW.w, 1);

  ctx.textAlign = 'left';
  ctx.fillStyle = PALETTE.ink;
  ctx.font = 'bold 17px Georgia, serif';
  ctx.fillText(`VELVET PAW · ${level.name}`, 18, 24);
  ctx.fillStyle = PALETTE.inkDim;
  ctx.font = '12.5px system-ui, sans-serif';
  ctx.fillText(level.sub, 18, 44);

  // Objective, centre stage.
  ctx.textAlign = 'center';
  ctx.font = 'bold 16px system-ui, sans-serif';
  if (!game.taken.gem) {
    ctx.fillStyle = PALETTE.gem;
    ctx.fillText('◆ Steal the Moon Gem — the exit stays locked until you do', VIEW.w / 2, 35);
  } else {
    ctx.fillStyle = '#5affaa';
    ctx.fillText('◆ Gem in paw — reach the glowing EXIT', VIEW.w / 2, 35);
  }

  // Score block, right side.
  ctx.textAlign = 'right';
  ctx.fillStyle = PALETTE.ink;
  ctx.font = 'bold 15px system-ui, sans-serif';
  const lootTotal = level.loots.length;
  ctx.fillText(
    `◆ ${game.taken.loots.size}/${lootTotal}   SCORE ${game.score}   ⏱ ${formatClock(game.levelTime)}   ${game.muted ? '🔇' : '♪'}`,
    VIEW.w - 18,
    35,
  );

  // Interact prompt floats over Velvet.
  if (game.interact && game.mode === 'play') {
    const label = game.interact.kind === 'gem'
      ? '[E] Take the Moon Gem'
      : `[E] Pocket the ${game.interact.loot.name}`;
    ctx.font = 'bold 14px system-ui, sans-serif';
    const w = ctx.measureText(label).width + 18;
    const x = game.player.x - w / 2;
    const y = game.player.y - 46;
    ctx.fillStyle = 'rgba(5, 7, 15, 0.85)';
    ctx.fillRect(x, y - 16, w, 24);
    ctx.strokeStyle = PALETTE.gold;
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y - 16, w, 24);
    ctx.fillStyle = PALETTE.gold;
    ctx.textAlign = 'center';
    ctx.fillText(label, game.player.x, y + 1);
  }

  if (game.mode === 'play') drawDetectionEye(ctx, game);

  // Flash message (locked exit, gem taken, and so on).
  if (game.message && game.message.t > 0) {
    ctx.textAlign = 'center';
    ctx.font = 'bold 17px system-ui, sans-serif';
    ctx.fillStyle = `rgba(255, 211, 106, ${Math.min(1, game.message.t)})`;
    ctx.fillText(game.message.text, VIEW.w / 2, HUD_H + 30);
  }
}

function panel(ctx, w, h, dimAlpha = 0.66) {
  // An engraved museum plaque: dark walnut-navy plate, a double brass
  // border and a brass rosette in each corner.
  const x = (VIEW.w - w) / 2;
  const y = (VIEW.h - h) / 2;
  ctx.fillStyle = `rgba(3, 4, 10, ${dimAlpha})`;
  ctx.fillRect(0, 0, VIEW.w, VIEW.h);
  ctx.fillStyle = 'rgba(13, 11, 24, 0.97)';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = PALETTE.brass;
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);
  ctx.strokeStyle = 'rgba(201, 162, 39, 0.5)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 5, y + 5, w - 10, h - 10);
  ctx.fillStyle = PALETTE.brass;
  for (const [cx, cy] of [[x + 13, y + 13], [x + w - 13, y + 13], [x + 13, y + h - 13], [x + w - 13, y + h - 13]]) {
    ctx.beginPath();
    ctx.arc(cx, cy, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  return { x, y, w, h };
}

function centreText(ctx, text, y, font, colour) {
  ctx.font = font;
  ctx.fillStyle = colour;
  ctx.textAlign = 'center';
  ctx.fillText(text, VIEW.w / 2, y);
}

export function drawTitle(ctx, game) {
  const p = panel(ctx, 700, 470, 0.42);
  const cy = p.y;
  centreText(ctx, '🐾  VELVET PAW', cy + 78, 'bold 52px Georgia, serif', PALETTE.gold);
  centreText(ctx, 'a tiny stealth caper in the Moonlit Museum', cy + 112, 'italic 17px Georgia, serif', PALETTE.inkDim);
  const story = [
    'You are Velvet, the museum\'s most polite cat burglar.',
    'Tonight the Moon Gem comes home with you — past the flashlights,',
    'through the shadows, and out before anyone says "!"',
  ];
  story.forEach((line, i) => centreText(ctx, line, cy + 156 + i * 24, '15.5px system-ui, sans-serif', PALETTE.ink));
  const controls = [
    'WASD / Arrows — move        SHIFT — sneak (silent, harder to see)',
    'E — take the gem & loot     P / Esc — pause     M — mute     R — retry',
    'Stay out of the cones. Carpet is shadow. Noise pulls guards toward you.',
  ];
  controls.forEach((line, i) => centreText(ctx, line, cy + 262 + i * 24, '14.5px system-ui, sans-serif', PALETTE.inkDim));
  centreText(ctx, 'Tonight:  I. The East Wing  ·  II. The Hall of Statues  ·  III. The Vault Rotunda', cy + 340, 'italic 14.5px Georgia, serif', PALETTE.brassBright);
  centreText(ctx, game.level.tip, cy + 368, 'italic 14.5px system-ui, sans-serif', PALETTE.warn);
  centreText(ctx, 'Press ENTER to slip inside', cy + 414, 'bold 19px system-ui, sans-serif', '#5affaa');
}

export function drawPause(ctx) {
  const p = panel(ctx, 460, 250);
  centreText(ctx, 'PAUSED', p.y + 70, 'bold 34px Georgia, serif', PALETTE.ink);
  centreText(ctx, 'The guards hold their breath too.', p.y + 108, 'italic 15px Georgia, serif', PALETTE.inkDim);
  centreText(ctx, 'P / Esc — resume      M — mute', p.y + 160, '15px system-ui, sans-serif', PALETTE.ink);
  centreText(ctx, 'R — restart this hall', p.y + 190, '15px system-ui, sans-serif', PALETTE.inkDim);
}

export function drawBusted(ctx, game) {
  const p = panel(ctx, 540, 300);
  centreText(ctx, 'BUSTED!', p.y + 82, 'bold 46px Georgia, serif', PALETTE.danger);
  centreText(ctx, 'A flashlight, a shout, and Velvet is escorted out.', p.y + 122, 'italic 15.5px Georgia, serif', PALETTE.ink);
  centreText(ctx, `${game.level.name} · spotted ${game.spotted}× · score ${game.score}`, p.y + 168, '16px system-ui, sans-serif', PALETTE.inkDim);
  centreText(ctx, 'Press R to try the hall again', p.y + 226, 'bold 18px system-ui, sans-serif', '#5affaa');
}

export function drawLevelComplete(ctx, game) {
  const p = panel(ctx, 560, 320);
  centreText(ctx, 'CLEAN GETAWAY', p.y + 76, 'bold 38px Georgia, serif', '#5affaa');
  centreText(ctx, `${game.level.name} is behind you.`, p.y + 112, 'italic 15.5px Georgia, serif', PALETTE.ink);
  const lines = [
    `Loot pocketed: ${game.taken.loots.size} of ${game.level.loots.length}`,
    `Time in hall: ${formatClock(game.levelTime)}`,
    `Times spotted: ${game.spotted}`,
    `Score: ${game.score}`,
  ];
  lines.forEach((line, i) => centreText(ctx, line, p.y + 156 + i * 26, '16px system-ui, sans-serif', PALETTE.inkDim));
  centreText(ctx, 'Press ENTER for the next hall', p.y + 282, 'bold 18px system-ui, sans-serif', PALETTE.gold);
}

export function drawVictory(ctx, game) {
  const p = panel(ctx, 620, 360);
  centreText(ctx, 'THE MOON GEM IS YOURS', p.y + 78, 'bold 36px Georgia, serif', PALETTE.gold);
  centreText(ctx, 'Three halls, one cat, zero arrests worth mentioning.', p.y + 116, 'italic 15.5px Georgia, serif', PALETTE.ink);
  const lines = [
    `Final score: ${game.score}`,
    `The Moon Gem: pocketed ◆`,
    `Loot across the night: ${game.totalLoot} of 12 pieces`,
    `Total time: ${formatClock(game.totalTime)} · Times spotted: ${game.totalSpotted}`,
    game.totalSpotted === 0 ? 'A ghost. The museum will never know.' : 'The guards will dine out on this story for weeks.',
  ];
  lines.forEach((line, i) => centreText(ctx, line, p.y + 162 + i * 27, '16.5px system-ui, sans-serif', PALETTE.inkDim));
  centreText(ctx, 'Press ENTER to prowl again', p.y + 306, 'bold 18px system-ui, sans-serif', '#5affaa');
}
