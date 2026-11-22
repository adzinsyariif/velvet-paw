// main.js — the conductor. It boots the game, owns the single state object
// every other module reads, runs the frame loop, and conducts the flow
// between modes: title -> play <-> pause, busted -> retry the hall,
// complete -> the next hall, and the final exit -> victory.

import { distance, pointInRect } from './config.js';
import { LEVELS, levelSolids } from './levels.js';
import { createAudio } from './audio.js';
import { attachInput, pressed, endFrame } from './input.js';
import { createPlayer, updatePlayer, nearestInteract } from './player.js';
import { createGuard, updateGuard, guardHearsNoise } from './guards.js';
import { drawScene } from './render.js';
import {
  drawHud, drawTitle, drawPause, drawBusted, drawLevelComplete, drawVictory,
} from './hud.js';
import { readScreenshotRequest, stageScreenshotScene } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const sfx = createAudio();

// The whole night in one object. Renderers and overlays read it; only the
// step functions below write it.
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

// Set a hall up fresh: its furniture becomes the solid list, its carpets
// the shadow list, Velvet at the door and the watch on their routes. The
// score is banked as the retry baseline — a busted hall costs only what
// was earned inside it.
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

// A brand-new night: clean totals, first hall, straight into play.
function startRun() {
  game.score = 0;
  game.totalSpotted = 0;
  game.totalLoot = 0;
  game.totalTime = 0;
  loadLevel(0);
  game.mode = 'play';
}

// A line of guidance (or alarm) shown briefly under the top bar.
function flashMessage(text, seconds = 2.6) {
  game.message = { text, t: seconds };
}

// The hall is robbed: bank the completion points plus a speed bonus that
// melts as the clock runs, then either the victory plaque or the door to
// the next hall.
function completeLevel() {
  const timeBonus = Math.max(0, 300 - Math.floor(game.levelTime) * 2);
  game.score += 200 + timeBonus;
  const wasFinalHall = game.levelIndex >= LEVELS.length - 1;
  if (wasFinalHall) {
    game.mode = 'victory';
    sfx.win();
  } else {
    game.mode = 'complete';
    sfx.complete();
  }
}

// The world as the actors see it: shared references plus the two callbacks
// the guards can raise — a spotting (which costs points) and a capture.
function buildWorld() {
  return {
    player: game.player,
    solids: game.solids,
    shadows: game.shadows,
    sfx,
    time: game.time,
    onSpotted: () => {
      game.spotted += 1;
      game.totalSpotted += 1;
      game.score = Math.max(0, game.score - 100);
      flashMessage('Spotted! Break line of sight!', 1.6);
    },
    onBusted: () => {
      if (game.mode === 'play') {
        game.mode = 'busted';
        sfx.lose();
      }
    },
  };
}

// Velvet's stride, overheard: every guard inside the noise radius turns
// toward the sound.
function broadcastNoise() {
  const noise = game.player.noise;
  if (!noise) return;
  for (const guard of game.guards) {
    if (distance(guard.x, guard.y, noise.x, noise.y) <= noise.r) {
      guardHearsNoise(guard, noise.x, noise.y);
    }
  }
}

// The interact key, spent: the gem before loot, because the exit only
// opens for the cat who is carrying it.
function spendInteract() {
  const target = game.interact;
  if (!target) return;
  if (target.kind === 'gem') {
    game.taken.gem = true;
    game.score += 300;
    sfx.pickup();
    flashMessage('The Moon Gem is in your paw — now get out!');
  } else {
    game.taken.loots.add(target.index);
    game.totalLoot += 1;
    game.score += 150;
    sfx.loot();
    flashMessage(`Pocketed the ${target.loot.name} (+150)`);
  }
  game.interact = null;
}

// Standing in the exit doorway: with the gem, the hall is complete;
// without it, a locked door and a reminder — throttled, so leaning on the
// door does not spam the message.
function checkExit() {
  const exit = game.level.exit;
  if (!pointInRect(game.player.x, game.player.y, exit)) return;
  if (game.taken.gem) {
    completeLevel();
  } else if (game.exitMsgCd <= 0) {
    flashMessage('Locked tight. The Moon Gem first, Velvet.');
    game.exitMsgCd = 3;
  }
}

// One frame inside a hall: clocks, the cat, her noise, her hands, the watch.
function stepPlay(dt) {
  game.levelTime += dt;
  game.totalTime += dt;
  game.exitMsgCd = Math.max(0, game.exitMsgCd - dt);

  const world = buildWorld();
  updatePlayer(game.player, dt, world);
  broadcastNoise();

  game.interact = nearestInteract(game.player, game.level, game.taken);
  if (pressed('KeyE') && game.interact) spendInteract();

  for (const guard of game.guards) updateGuard(guard, dt, world);
  if (game.mode !== 'play') return; // a capture ends the frame early

  checkExit();
}

// Retry the current hall at its banked score — the pause menu's and the
// busted screen's shared way back in.
function retryLevel() {
  game.score = game.scoreAtLevelStart;
  loadLevel(game.levelIndex);
  game.mode = 'play';
}

// Mode steps: each mode minds its own keys, nothing more.
const MODE_STEPS = {
  title(dt) {
    if (pressed('Enter')) startRun();
  },
  play(dt) {
    if (pressed('KeyP') || pressed('Escape')) {
      game.mode = 'pause';
      return;
    }
    stepPlay(dt);
  },
  pause(dt) {
    if (pressed('KeyP') || pressed('Escape')) game.mode = 'play';
    else if (pressed('KeyR')) retryLevel();
  },
  busted(dt) {
    if (pressed('KeyR')) retryLevel();
  },
  complete(dt) {
    if (pressed('Enter')) {
      loadLevel(game.levelIndex + 1);
      game.mode = 'play';
    }
  },
  victory(dt) {
    if (pressed('Enter')) {
      game.mode = 'title';
      loadLevel(0);
    }
  },
};

// One frame of the whole game: age the message, honour the mute key, then
// let the current mode step.
function stepGame(dt) {
  if (game.message) {
    game.message.t -= dt;
    if (game.message.t <= 0) game.message = null;
  }
  if (pressed('KeyM')) {
    game.muted = sfx.toggleMute();
  }
  const stepMode = MODE_STEPS[game.mode];
  if (stepMode) stepMode(dt);
}

// Paint: the hall always, then the HUD during a run, then whichever plaque
// the mode hangs over the glass.
function drawGame() {
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

// Boot sequence: set the first hall behind the title, then honour a
// screenshot request if the URL carries one (staged scenes freeze the
// clock), and arm the input listeners whose first gesture wakes the audio.
function bootGame() {
  loadLevel(0);
  const shotRequest = readScreenshotRequest();
  if (shotRequest) {
    if (shotRequest.name === 'end') loadLevel(LEVELS.length - 1);
    stageScreenshotScene(game, shotRequest);
  }
  attachInput(() => sfx.unlock());
}
bootGame();

// The frame loop: real elapsed time, clamped so a backgrounded tab cannot
// teleport anyone on return. A frozen (staged) scene still paints.
let lastTimestamp = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - lastTimestamp) / 1000);
  lastTimestamp = now;
  if (!game.frozen) {
    game.time += dt;
    stepGame(dt);
  }
  drawGame();
  endFrame();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// A tiny handle for headless smoke tests and curious players alike.
window.__velvet = { game, startRun, loadLevel };
