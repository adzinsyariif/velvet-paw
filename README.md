# 🐾 Velvet Paw — a tiny stealth caper

[![make.fun · best-stealth-game-20261121-1759](https://make.fun/badge/best-stealth-game-20261121-1759.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![rank](https://make.fun/badge/best-stealth-game-20261121-1759/adzinsyariif/velvet-paw/rank.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![reward](https://make.fun/badge/best-stealth-game-20261121-1759/adzinsyariif/velvet-paw/reward.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)

An entry for the make.fun bounty [“Make the best stealth game”](https://make.fun/bounty/best-stealth-game-20261121-1759).

**The story.** You are Velvet, the Moonlit Museum's most polite cat burglar.
Tonight the Moon Gem comes home with you. Slip through three halls — the East
Wing, the Hall of Statues and the Vault Rotunda — past patrolling guards and
their flashlight cones, pocket the golden loot that nobody will miss, take the
gem from its pedestal, and reach the glowing exit before anyone lays a hand on
you. The exit stays locked until the gem is in your paw.

**How to play**

- **WASD / arrow keys** — move. **Shift** — sneak: slower, silent, and much
  harder to spot.
- **E** — take the Moon Gem and pocket loot when you are close.
- **P / Esc** — pause. **M** — mute. **R** — retry the hall.
- Guards see in a cone, and walls, display cases, pillars, crates and planters
  all block their sight. A per-guard meter fills while you are seen — faster
  when you are close, lit and upright, slower when you sneak in shadow — and a
  **?** means a guard is coming to look; a **!** means run.
- Running is noisy: on marble it pulls nearby guards toward you. The dark
  carpets are shadow — quieter to cross and far harder to be seen on.
- Score comes from loot (+150), the gem (+300), a clean getaway (+200 and a
  time bonus), minus 100 each time you are spotted.

**Run it.** The game is plain static files with no build step and no network
requests. Serve it and open a desktop browser:

```
node serve.ts        # then visit http://localhost:8080
```

**File layout**

- `main.ts` — the hand-in program: copies `game/` and `screenshots/` into the
  output directory and writes `dossier.json` with the vendored library.
- `serve.ts` — a small Node standard-library server for local play.
- `game/index.html` — the page; `game/src/` holds the game as ES modules, one
  job each: `config.js` (constants and palette), `levels.js` (the three halls
  as data), `audio.js` (all sound, synthesized with WebAudio), `input.js`
  (keyboard), `vision.js` (line of sight, cone geometry, sliding movement),
  `guards.js` (patrols, detection, the guard state machine), `player.js`
  (Velvet: gaits, noise, interaction), `render.js` (canvas art and the
  flashlight lighting), `hud.js` (objective bar and overlay screens),
  `shots.js` (deterministic screenshot staging via `?shot=…&seed=…`), and
  `main.js` (boot, the game loop and the flow between screens).
- `vendor/makefun-game.ts` — the make.fun dossier library, vendored unchanged.
- `screenshots/` — four real renders of the game, listed in `shots.json`.

## License

MIT — see `LICENSE`.
