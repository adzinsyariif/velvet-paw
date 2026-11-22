// Velvet Paw — hand-in program (Node 22, standard library only).
// The game itself is this directory's game/ folder: plain static files a
// desktop browser loads offline (game/index.html and its ES modules, no
// library, no network request). This program copies game/ and screenshots/
// from beside itself into the output directory and writes dossier.json
// there, the summary the judge reads, using the vendored make.fun library.
//
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

const dossier = buildDossier(out, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(out, 'dossier.json'), dossier);

// A short hand-in summary, so a human running this sees what was handed over.
const gameFiles = readdirSync(join(out, 'game'), { recursive: true }).length;
const shotFiles = readdirSync(join(out, 'screenshots'));
const shotKb = shotFiles.reduce(
  (sum, name) => sum + statSync(join(out, 'screenshots', name)).size,
  0,
) / 1024;
const dossierKb = (statSync(join(out, 'dossier.json')).size / 1024).toFixed(1);
console.log(`Velvet Paw handed in: ${gameFiles} game files, ${shotFiles.length} screenshots (${[...shotFiles].sort().join(', ')}, ${shotKb.toFixed(1)} KiB in all), dossier.json ${dossierKb} KiB -> ${out}`);
