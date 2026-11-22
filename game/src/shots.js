// shots.js — deterministic scene staging for screenshots.
// ?shot=start|play|chase|end&seed=1 freezes the simulation and arranges a
// scene that shows the game honestly: the title over a live hall, a sneak in
// carpet shadow beside a cone, an alert beside the gem, and the victory.

export function readScreenshotRequest() {
  const q = new URLSearchParams(window.location.search);
  const name = q.get('shot');
  if (!name) return null;
  return { name, seed: Number(q.get('seed') || '1') };
}

function place(guard, x, y, angle, state, meter) {
  guard.x = x;
  guard.y = y;
  guard.angle = angle;
  guard.holdAngle = angle;
  guard.state = state;
  guard.meter = meter;
  guard.waitT = 0;
}

export function stageScreenshotScene(game, shot) {
  game.frozen = true;
  game.time = 2.4;
  const [g0, g1, g2, g3] = game.guards;
  const p = game.player;

  if (shot.name === 'start') {
    game.mode = 'title';
    // The cover: title over a lamplit hall. One cone rakes the gem's corner,
    // another sweeps the bottom carpet where Velvet waits in shadow, just
    // left of the plaque where she stays visible.
    place(g0, 820, 170, 0.5, 'patrol', 0);
    if (g1) place(g1, 1120, 660, Math.PI, 'patrol', 0);
    p.x = 250;
    p.y = 655;
    p.angle = -Math.PI / 2;
    p.gait = 'sneak';
    p.inShadow = true;
    return;
  }

  if (shot.name === 'play') {
    game.mode = 'play';
    // Velvet slips across the centre carpet between two crossing cones,
    // display cases fore and aft, one guard already a little suspicious.
    place(g0, 505, 285, 0.45, 'patrol', 0.22);
    if (g1) place(g1, 905, 480, Math.PI + 0.5, 'patrol', 0);
    p.x = 700;
    p.y = 392;
    p.angle = -Math.PI / 2;
    p.gait = 'sneak';
    p.inShadow = true;
    return;
  }

  if (shot.name === 'chase') {
    game.mode = 'play';
    // A guard has just filled his meter beside the gem pedestal; the alarm
    // eye hangs wide and red over the hall.
    place(g0, 1000, 190, -0.43, 'chase', 1);
    g0.seesPlayer = true;
    if (g1) place(g1, 700, 470, Math.PI, 'patrol', 0);
    p.x = 1076;
    p.y = 148;
    p.angle = 0.4;
    p.gait = 'run';
    game.taken.loots = new Set([0]);
    game.score = 350;
    game.spotted = 1;
    return;
  }

  if (shot.name === 'end') {
    game.mode = 'victory';
    game.taken.gem = true;
    game.taken.loots = new Set([0, 1, 2, 3, 4]);
    game.score = 2450;
    game.totalLoot = 12;
    game.totalTime = 402;
    game.totalSpotted = 1;
    game.spotted = 0;
    // Velvet stands in the glowing exit of the rotunda, gem in paw.
    p.x = 96;
    p.y = 150;
    p.angle = Math.PI;
    p.gait = 'stand';
    place(g0, 830, 250, Math.PI / 2, 'patrol', 0);
    if (g1) place(g1, 560, 470, Math.PI, 'patrol', 0);
    if (g2) place(g2, 1120, 300, -Math.PI / 2, 'patrol', 0);
    if (g3) place(g3, 640, 690, 0, 'patrol', 0);
    return;
  }

  // Unknown shot name: fall back to the title scene.
  game.mode = 'title';
}
