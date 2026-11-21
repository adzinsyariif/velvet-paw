// main.js — boot, the game loop and the flow between modes:
// title -> play <-> pause, busted -> retry, complete -> next hall, victory.

import { distance, pointInRect } from './config.js';
import { LEVELS, levelSolids } from './levels.js';
import { createAudio } from './audio.js';
import { attachInput, pressed, endFrame } from './input.js';
import { createPlayer, updatePlayer, nearestInteract } from './player.js';
import { createGuard, updateGuard, hearNoise } from './guards.js';
import { drawScene } from './render.js';
import {
  drawHud, drawTitle, drawPause, drawBusted, drawLevelComplete, drawVictory,
} from './hud.js';
import { readShot, stageShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const sfx = createAudio();

const game = {
  mode: 'title',
  levelIndex: 0,
  level: null,
  solids: [],
  shadows: [],
  player: null,
  guards: [],
  taken: { gem: false, loots: new Set() },
  score: 0,
  scoreAtLevelStart: 0,
  spotted: 0,
  totalSpotted: 0,
  totalLoot: 0,
  levelTime: 0,
  totalTime: 0,
  time: 0,
  message: null,
  interact: null,
  muted: false,
  frozen: false,
  exitMsgCd: 0,
};

function loadLevel(index) {
  game.levelIndex = index;
  game.level = LEVELS[index];
  game.solids = levelSolids(game.level);
  game.shadows = game.level.shadows;
  game.player = createPlayer(game.level.start);
  game.guards = game.level.guards.map((def, i) => createGuard(def, i));
  game.taken = { gem: false, loots: new Set() };
  game.spotted = 0;
  game.levelTime = 0;
  game.message = null;
  game.interact = null;
  game.scoreAtLevelStart = game.score;
}

function startRun() {
  game.score = 0;
  game.totalSpotted = 0;
  game.totalLoot = 0;
  game.totalTime = 0;
  loadLevel(0);
  game.mode = 'play';
}

function flash(text, seconds = 2.6) {
  game.message = { text, t: seconds };
}

function completeLevel() {
  const timeBonus = Math.max(0, 300 - Math.floor(game.levelTime) * 2);
  game.score += 200 + timeBonus;
  if (game.levelIndex >= LEVELS.length - 1) {
    game.mode = 'victory';
    sfx.win();
  } else {
    game.mode = 'complete';
    sfx.complete();
  }
}

function stepPlay(dt) {
  game.levelTime += dt;
  game.totalTime += dt;
  game.exitMsgCd = Math.max(0, game.exitMsgCd - dt);

  const world = {
    player: game.player,
    solids: game.solids,
    shadows: game.shadows,
    sfx,
    time: game.time,
    onSpotted: () => {
      game.spotted += 1;
      game.totalSpotted += 1;
      game.score = Math.max(0, game.score - 100);
      flash('Spotted! Break line of sight!', 1.6);
    },
    onBusted: () => {
      if (game.mode === 'play') {
        game.mode = 'busted';
        sfx.lose();
      }
    },
  };

  updatePlayer(game.player, dt, world);

  if (game.player.noise) {
    for (const g of game.guards) {
      if (distance(g.x, g.y, game.player.noise.x, game.player.noise.y) <= game.player.noise.r) {
        hearNoise(g, game.player.noise.x, game.player.noise.y);
      }
    }
  }

  game.interact = nearestInteract(game.player, game.level, game.taken);
  if (pressed('KeyE') && game.interact) {
    if (game.interact.kind === 'gem') {
      game.taken.gem = true;
      game.score += 300;
      sfx.pickup();
      flash('The Moon Gem is in your paw — now get out!');
    } else {
      game.taken.loots.add(game.interact.index);
      game.totalLoot += 1;
      game.score += 150;
      sfx.loot();
      flash(`Pocketed the ${game.interact.loot.name} (+150)`);
    }
    game.interact = null;
  }

  for (const g of game.guards) updateGuard(g, dt, world);
  if (game.mode !== 'play') return;

  const e = game.level.exit;
  if (pointInRect(game.player.x, game.player.y, e)) {
    if (game.taken.gem) {
      completeLevel();
    } else if (game.exitMsgCd <= 0) {
      flash('Locked tight. The Moon Gem first, Velvet.');
      game.exitMsgCd = 3;
    }
  }
}

function step(dt) {
  if (game.message) {
    game.message.t -= dt;
    if (game.message.t <= 0) game.message = null;
  }
  if (pressed('KeyM')) {
    game.muted = sfx.toggleMute();
  }

  switch (game.mode) {
    case 'title':
      if (pressed('Enter')) startRun();
      break;
    case 'play':
      if (pressed('KeyP') || pressed('Escape')) {
        game.mode = 'pause';
        break;
      }
      stepPlay(dt);
      break;
    case 'pause':
      if (pressed('KeyP') || pressed('Escape')) game.mode = 'play';
      else if (pressed('KeyR')) {
        game.score = game.scoreAtLevelStart;
        loadLevel(game.levelIndex);
        game.mode = 'play';
      }
      break;
    case 'busted':
      if (pressed('KeyR')) {
        game.score = game.scoreAtLevelStart;
        loadLevel(game.levelIndex);
        game.mode = 'play';
      }
      break;
    case 'complete':
      if (pressed('Enter')) {
        loadLevel(game.levelIndex + 1);
        game.mode = 'play';
      }
      break;
    case 'victory':
      if (pressed('Enter')) {
        game.mode = 'title';
        loadLevel(0);
      }
      break;
    default:
      break;
  }
}

function draw() {
  drawScene(ctx, game);
  if (game.mode === 'title') {
    drawTitle(ctx, game);
    return;
  }
  drawHud(ctx, game);
  if (game.mode === 'pause') drawPause(ctx);
  else if (game.mode === 'busted') drawBusted(ctx, game);
  else if (game.mode === 'complete') drawLevelComplete(ctx, game);
  else if (game.mode === 'victory') drawVictory(ctx, game);
}

loadLevel(0);
const shot = readShot();
if (shot) {
  if (shot.name === 'end') loadLevel(LEVELS.length - 1);
  stageShot(game, shot);
}

attachInput(() => sfx.unlock());

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (!game.frozen) {
    game.time += dt;
    step(dt);
  }
  draw();
  endFrame();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// A tiny handle for headless smoke tests and curious players alike.
window.__velvet = { game, startRun, loadLevel };
