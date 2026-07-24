/**
 * CI parity: SDK public routes must cover SPA PUBLIC_ROUTES (+ /s hosted).
 * Run from repo root:
 *   node agentstack-unified-sdk/packages/core/scripts/check-public-route-parity.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
// .../agentstack-unified-sdk/packages/core/scripts → AgentStack/
const repoRoot = path.resolve(here, '..', '..', '..', '..');

const spaPath = path.join(repoRoot, 'agentstack-frontend', 'src', 'utils', 'publicRoutes.ts');
const sdkPath = path.join(here, '..', 'src', 'utils', 'publicRoutes.ts');

function extractRoutes(src) {
  const m = src.match(/=\s*\[([\s\S]*?)\]\s*as const/);
  if (!m) return [];
  return [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]);
}

if (!fs.existsSync(spaPath)) {
  console.error('SPA publicRoutes missing at', spaPath);
  process.exit(1);
}
if (!fs.existsSync(sdkPath)) {
  console.error('SDK publicRoutes missing at', sdkPath);
  process.exit(1);
}

const spa = extractRoutes(fs.readFileSync(spaPath, 'utf8'));
const sdk = new Set(extractRoutes(fs.readFileSync(sdkPath, 'utf8')));

const missing = spa.filter((r) => !sdk.has(r));
if (missing.length) {
  console.error('SDK public routes missing SPA routes:', missing.join(', '));
  process.exit(1);
}
console.log(`public-route parity OK (${spa.length} SPA routes ⊆ SDK); repoRoot=${repoRoot}`);
