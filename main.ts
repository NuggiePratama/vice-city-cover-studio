// Vice City Cover Studio — the entry program (Node 22, standard library
// only). It hands the app in: copies app/ and screenshots/ from beside
// this file into the output directory and writes /output/dossier.json
// with the vendored make.fun library, so the judge can read the entry.
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// Serve the app itself with `node serve.ts`, then open http://localhost:8080.
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Clears only what is inside a directory. The directory itself is
// never removed: the grader owns it, and deleting it broke fps-02 v1.
function emptyContents(dir) {
  for (const entry of readdirSync(dir)) {
    rmSync(join(dir, entry), { recursive: true, force: true });
  }
}

mkdirSync(outputDir, { recursive: true });
emptyContents(outputDir);
cpSync(join(repoRoot, 'app'), join(outputDir, 'app'), { recursive: true });
mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
const shots = join(repoRoot, 'screenshots');
if (existsSync(shots)) cpSync(shots, join(outputDir, 'screenshots'), { recursive: true });

writeFileSync(
  join(outputDir, 'dossier.json'),
  buildDossier(outputDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
    app_path_max_bytes: 1000,
  }),
);
const shotCount = existsSync(shots) ? readdirSync(shots).length : 0;
console.log(`wrote ${outputDir}/dossier.json (app/ + ${shotCount} screenshots)`);
