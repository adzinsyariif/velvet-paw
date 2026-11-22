# 🐾 Velvet Paw — a tiny stealth caper

[![make.fun · best-stealth-game-20261121-1759](https://make.fun/badge/best-stealth-game-20261121-1759.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![rank](https://make.fun/badge/best-stealth-game-20261121-1759/adzinsyariif/velvet-paw/rank.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![reward](https://make.fun/badge/best-stealth-game-20261121-1759/adzinsyariif/velvet-paw/reward.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)

An entry for the make.fun bounty [“Make the best stealth game”](https://make.fun/bounty/best-stealth-game-20261121-1759).

**The story.** The Moonlit Museum sleeps under lamplight: marble halls, gilt
paintings, glass cases humming with other people's treasures. And one small
cat in a violet hood, padding through it on velvet paws. You are Velvet, the
museum's most polite burglar, and tonight the Moon Gem — stolen from her
family a century ago, if you believe the plaque — comes home with you.

Three halls stand between you and the door. **I. The East Wing**, all wide
marble and two unhurried guards. **II. The Hall of Statues**, where three
patrols cross like clockwork hands. **III. The Vault Rotunda**, four guards,
one gem, no mercy. Pocket the golden loot nobody will miss (a Sun Mask, a
Pearl Tiara, a Star Sapphire…), lift the gem from its pedestal, and reach the
glowing exit before a flashlight finds you. The exit stays locked until the
gem is in your paw.

**How to play**

- **WASD / arrow keys** — move. **Shift** — sneak: slower, silent, lower to
  the ground and much harder to spot.
- **E** — take the Moon Gem and pocket loot when you are close.
- **P / Esc** — pause. **M** — mute. **R** — retry the hall.
- Guards see in a flashlight cone with a bright leading edge, and walls,
  display cases, pillars, crates and planters all block their sight — the
  cone itself is clipped by the same geometry, so what you see is exactly
  what they see. A per-guard meter on a brass plaque fills while you are
  seen: faster when you are close, lit and upright, slower when you sneak in
  shadow, and it drains again when you break line of sight. A **?** means a
  guard is coming to look; a **!** means run. The brass alarm eye under the
  top bar opens and fills with the most suspicious guard's meter, so the
  whole museum's mood is readable at a glance.
- Detection is recoverable, never instant: get behind a case, let the meter
  fall, and the patrol forgets you. Guards who lose you search your last
  seen spot, then give up and return to their routes — learn the routes,
  and the halls open up.
- Running is noisy: on marble it pulls nearby guards toward the sound. The
  dark velvet carpets are shadow — quieter to cross, and far harder to be
  seen on. Lamplight pools along the walls are the opposite: pretty, and
  dangerous.
- Score comes from loot (+150 each, twelve pieces across the night), the
  Moon Gem (+300), a clean getaway (+200 and a time bonus), minus 100 each
  time you are spotted. Finish all three halls unseen for a perfect ghost
  run.

**Run it.** The game is plain static files with no build step and no network
requests — about 1,900 lines of hand-written JavaScript and synthesized
WebAudio, nothing else. Serve it and open a desktop browser:

```
node serve.ts        # then visit http://localhost:8080
```

**File layout**

- `main.ts` — the hand-in program: copies `game/` and `screenshots/` into the
  output directory and writes `dossier.json` with the vendored library.
- `serve.ts` — a small Node standard-library server for local play.
- `game/index.html` — the page; `game/src/` holds the game as ES modules, one
  job each: `config.js` (constants, palette and math helpers), `levels.js`
  (the three halls as data), `audio.js` (all sound, synthesized with
  WebAudio), `input.js` (keyboard), `vision.js` (line of sight, cone
  membership, detection rates, sliding movement), `guards.js` (patrols,
  hearing, the guard state machine), `player.js` (Velvet: gaits, noise,
  interaction), `render.js` (the lamplit marble hall, sprites and the
  raycast flashlight lighting), `hud.js` (objective bar, the alarm eye and
  the engraved overlay plaques), `shots.js` (deterministic screenshot
  staging via `?shot=…&seed=…`), and `main.js` (boot, the game loop and the
  flow between screens).
- `vendor/makefun-game.ts` — the make.fun dossier library, vendored unchanged.
- `screenshots/` — four real renders of the game, listed in `shots.json`.

## License

MIT — see `LICENSE`.
