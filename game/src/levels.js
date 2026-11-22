// levels.js — the three Moonlit Museum halls as plain data.
// Coordinates live in the 1280x800 canvas; the hall floor is x 40..1240, y 70..760.
// walls and props are solid: they block movement AND sight lines.
// shadows are carpet zones: quieter to cross and much harder to be seen in.

export const FLOOR = { x: 40, y: 70, w: 1200, h: 690 };
export const WALL_T = 18;

// The four border walls of a hall, as solid rects.
export function borderSolids() {
  return [
    { x: FLOOR.x - WALL_T, y: FLOOR.y - WALL_T, w: FLOOR.w + WALL_T * 2, h: WALL_T, kind: 'wall' },
    { x: FLOOR.x - WALL_T, y: FLOOR.y + FLOOR.h, w: FLOOR.w + WALL_T * 2, h: WALL_T, kind: 'wall' },
    { x: FLOOR.x - WALL_T, y: FLOOR.y, w: WALL_T, h: FLOOR.h, kind: 'wall' },
    { x: FLOOR.x + FLOOR.w, y: FLOOR.y, w: WALL_T, h: FLOOR.h, kind: 'wall' },
  ];
}

export const LEVELS = [
  {
    name: 'I. The East Wing',
    sub: 'Level 1 · Two guards, wide halls',
    tip: 'Hold SHIFT to sneak. Carpets are shadow: you are harder to see on them.',
    start: { x: 130, y: 660 },
    gem: { x: 1120, y: 160 },
    exit: { x: 1158, y: 620, w: 64, h: 110 },
    shadows: [
      { x: 90, y: 560, w: 420, h: 120 },
      { x: 520, y: 330, w: 340, h: 110 },
      { x: 90, y: 90, w: 300, h: 110 },
    ],
    walls: [
      { x: 430, y: 70, w: 20, h: 290, kind: 'wall' },
      { x: 760, y: 400, w: 20, h: 360, kind: 'wall' },
    ],
    props: [
      { x: 220, y: 240, w: 90, h: 44, kind: 'case' },
      { x: 600, y: 170, w: 90, h: 44, kind: 'case' },
      { x: 880, y: 250, w: 44, h: 44, kind: 'pillar' },
      { x: 300, y: 430, w: 48, h: 48, kind: 'crate' },
      { x: 1020, y: 430, w: 80, h: 40, kind: 'planter' },
      { x: 1010, y: 250, w: 90, h: 44, kind: 'case' },
      { x: 620, y: 600, w: 44, h: 44, kind: 'pillar' },
      { x: 180, y: 120, w: 48, h: 48, kind: 'crate' },
    ],
    loots: [
      { x: 265, y: 316, name: 'Sun Mask' },
      { x: 645, y: 252, name: 'Jade Cup' },
      { x: 1055, y: 336, name: 'Brass Astrolabe' },
    ],
    guards: [
      { route: [
        { x: 520, y: 150, wait: 0.6 }, { x: 1080, y: 150, wait: 1.4 },
        { x: 1080, y: 300, wait: 0.6 }, { x: 520, y: 300, wait: 1.0 },
      ] },
      { route: [
        { x: 200, y: 470, wait: 0.8 }, { x: 700, y: 470, wait: 0.6 },
        { x: 700, y: 640, wait: 1.2 }, { x: 200, y: 640, wait: 0.6 },
      ] },
    ],
  },
  {
    name: 'II. The Hall of Statues',
    sub: 'Level 2 · Three guards, crossing patrols',
    tip: 'A guard with a ? is suspicious. Break line of sight and let his meter fall.',
    start: { x: 120, y: 120 },
    gem: { x: 640, y: 690 },
    exit: { x: 1158, y: 88, w: 64, h: 110 },
    shadows: [
      { x: 520, y: 300, w: 240, h: 200 },
      { x: 90, y: 560, w: 330, h: 120 },
      { x: 880, y: 90, w: 300, h: 110 },
    ],
    walls: [
      { x: 330, y: 70, w: 20, h: 260, kind: 'wall' },
      { x: 930, y: 430, w: 20, h: 330, kind: 'wall' },
      { x: 330, y: 430, w: 280, h: 20, kind: 'wall' },
      { x: 700, y: 250, w: 280, h: 20, kind: 'wall' },
    ],
    props: [
      { x: 480, y: 150, w: 44, h: 44, kind: 'pillar' },
      { x: 740, y: 150, w: 44, h: 44, kind: 'pillar' },
      { x: 480, y: 600, w: 44, h: 44, kind: 'pillar' },
      { x: 740, y: 600, w: 44, h: 44, kind: 'pillar' },
      { x: 150, y: 330, w: 90, h: 44, kind: 'case' },
      { x: 1040, y: 300, w: 90, h: 44, kind: 'case' },
      { x: 620, y: 390, w: 48, h: 48, kind: 'crate' },
      { x: 180, y: 640, w: 80, h: 40, kind: 'planter' },
    ],
    loots: [
      { x: 195, y: 412, name: 'Ivory Fan' },
      { x: 1085, y: 382, name: 'Opal Brooch' },
      { x: 640, y: 120, name: 'Gilt Hourglass' },
      { x: 900, y: 648, name: 'Onyx Chess King' },
    ],
    guards: [
      { route: [
        { x: 200, y: 220, wait: 0.6 }, { x: 1080, y: 220, wait: 1.2 },
        { x: 1080, y: 120, wait: 0.6 }, { x: 200, y: 120, wait: 1.0 },
      ] },
      { route: [
        { x: 420, y: 470, wait: 0.6 }, { x: 860, y: 470, wait: 1.0 },
        { x: 860, y: 660, wait: 0.6 }, { x: 420, y: 660, wait: 1.2 },
      ] },
      { route: [
        { x: 640, y: 300, wait: 1.6 }, { x: 640, y: 560, wait: 0.8 },
      ] },
    ],
  },
  {
    name: 'III. The Vault Rotunda',
    sub: 'Level 3 · Four guards, one gem, no mercy',
    tip: 'The rotunda carpet is your friend. Cross the marble only when cones turn away.',
    start: { x: 130, y: 680 },
    gem: { x: 640, y: 400 },
    exit: { x: 52, y: 88, w: 70, h: 110 },
    shadows: [
      { x: 470, y: 280, w: 340, h: 240 },
      { x: 900, y: 560, w: 290, h: 120 },
      { x: 90, y: 330, w: 260, h: 110 },
    ],
    walls: [
      { x: 250, y: 70, w: 20, h: 200, kind: 'wall' },
      { x: 1010, y: 70, w: 20, h: 200, kind: 'wall' },
      { x: 250, y: 560, w: 20, h: 200, kind: 'wall' },
      { x: 1010, y: 560, w: 20, h: 200, kind: 'wall' },
    ],
    props: [
      { x: 520, y: 300, w: 44, h: 44, kind: 'pillar' },
      { x: 716, y: 300, w: 44, h: 44, kind: 'pillar' },
      { x: 520, y: 456, w: 44, h: 44, kind: 'pillar' },
      { x: 716, y: 456, w: 44, h: 44, kind: 'pillar' },
      { x: 150, y: 180, w: 90, h: 44, kind: 'case' },
      { x: 1040, y: 180, w: 90, h: 44, kind: 'case' },
      { x: 150, y: 620, w: 90, h: 44, kind: 'case' },
      { x: 1040, y: 620, w: 90, h: 44, kind: 'case' },
      { x: 640, y: 120, w: 48, h: 48, kind: 'crate' },
      { x: 616, y: 648, w: 48, h: 48, kind: 'crate' },
      { x: 360, y: 390, w: 70, h: 36, kind: 'planter' },
      { x: 850, y: 390, w: 70, h: 36, kind: 'planter' },
    ],
    loots: [
      { x: 195, y: 262, name: 'Pearl Tiara' },
      { x: 1085, y: 262, name: 'Ruby Snuffbox' },
      { x: 195, y: 700, name: 'Silver Flute' },
      { x: 1085, y: 700, name: 'Ebony Cameo' },
      { x: 640, y: 196, name: 'Star Sapphire' },
    ],
    guards: [
      { route: [
        { x: 450, y: 250, wait: 0.8 }, { x: 830, y: 250, wait: 0.8 },
        { x: 830, y: 550, wait: 0.8 }, { x: 450, y: 550, wait: 0.8 },
      ] },
      { route: [
        { x: 160, y: 470, wait: 0.6 }, { x: 160, y: 120, wait: 1.2 },
        { x: 560, y: 120, wait: 0.6 }, { x: 560, y: 470, wait: 1.0 },
      ] },
      { route: [
        { x: 1120, y: 470, wait: 0.6 }, { x: 1120, y: 120, wait: 1.2 },
        { x: 720, y: 120, wait: 0.6 }, { x: 720, y: 470, wait: 1.0 },
      ] },
      { route: [
        { x: 300, y: 690, wait: 0.8 }, { x: 980, y: 690, wait: 1.0 },
        { x: 980, y: 560, wait: 0.6 }, { x: 300, y: 560, wait: 0.6 },
      ] },
    ],
  },
];

// All solid rects for a level: border + interior walls + props.
export function levelSolids(level) {
  return borderSolids().concat(level.walls, level.props);
}
