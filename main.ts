// Velvet Heat v4 — entry program (Node 22, no dependencies).
// Copies app/ and screenshots/ from this repository into /output and writes
// /output/dossier.json with the kit's vendor/makefun-app.ts buildDossier.
// Run: node main.ts   (from the repository root)

import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const repoRoot = dirname(fileURLToPath(import.meta.url));
const outDir = '/output';

const DOSSIER_CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
};

function fail(message) {
  console.error(`main.ts: ${message}`);
  process.exit(1);
}

const appDir = join(repoRoot, 'app');
const shotsDir = join(repoRoot, 'screenshots');
if (!existsSync(appDir)) fail('app/ missing in repository');
if (!existsSync(shotsDir)) fail('screenshots/ missing in repository');

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });
cpSync(appDir, join(outDir, 'app'), { recursive: true });
cpSync(shotsDir, join(outDir, 'screenshots'), { recursive: true });

let dossier;
try {
  dossier = buildDossier(outDir, DOSSIER_CAPS);
} catch (err) {
  fail(`buildDossier refused the entry: ${err.message}`);
}
writeFileSync(join(outDir, 'dossier.json'), dossier);
// Verify the write round-trips: re-read and confirm the bytes match, so a
// truncated or partial dossier can never ship silently.
const written = readFileSync(join(outDir, 'dossier.json'));
if (!written.equals(dossier)) fail('dossier.json on disk does not match what buildDossier returned');
const appCount = readdirSync(join(outDir, 'app'), { recursive: true }).length;
const shotCount = readdirSync(join(outDir, 'screenshots')).length;
console.log(`main.ts: wrote /output/dossier.json (${dossier.length} bytes, verified)`);
console.log(`main.ts: copied app/ (${appCount} entries) and screenshots/ (${shotCount} files) to /output`);
