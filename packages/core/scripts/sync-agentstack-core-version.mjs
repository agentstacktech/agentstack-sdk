/**
 * Reads AGENTSTACK_CORE_VERSION from monorepo shared/constants.py and writes
 * src/generated/agentstack-core-version.ts so @agentstack/sdk stays aligned with Core.
 *
 * Standalone agentstack-sdk checkouts have no sibling shared/ — keep the committed
 * generated file so `npm run build` (prebuild) succeeds.
 *
 * Run: npm run sync:agentstack-version (also prebuild / pretest / pretype-check).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { findMonorepoFile } from '../../../scripts/monorepo-layout.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const corePackageRoot = path.resolve(__dirname, '..');
const constantsPath = findMonorepoFile(corePackageRoot, 'shared', 'constants.py');
const outPath = path.resolve(corePackageRoot, 'src/generated/agentstack-core-version.ts');

if (!constantsPath) {
  if (fs.existsSync(outPath)) {
    console.log(
      'sync-agentstack-core-version: no monorepo shared/constants.py; keeping',
      path.relative(corePackageRoot, outPath),
    );
    process.exit(0);
  }
  console.error(
    'sync-agentstack-core-version: missing shared/constants.py and',
    outPath,
  );
  process.exit(1);
}

const raw = fs.readFileSync(constantsPath, 'utf8');
const m = raw.match(/AGENTSTACK_CORE_VERSION:\s*str\s*=\s*["']([^"']+)["']/);
if (!m) {
  console.error(
    'sync-agentstack-core-version: could not parse AGENTSTACK_CORE_VERSION in',
    constantsPath
  );
  process.exit(1);
}
const version = m[1];
const banner = `/**
 * Auto-generated from monorepo shared/constants.py (AGENTSTACK_CORE_VERSION).
 * Do not edit by hand — run: npm run sync:agentstack-version
 */
`;
const body = `${banner}export const AGENTSTACK_CORE_VERSION = '${version}' as const;
`;
fs.mkdirSync(path.dirname(outPath), { recursive: true });
if (fs.existsSync(outPath)) {
  const prev = fs.readFileSync(outPath, 'utf8');
  if (prev === body) {
    console.log(
      'sync-agentstack-core-version:',
      version,
      '(unchanged)',
      path.relative(corePackageRoot, outPath),
    );
    process.exit(0);
  }
}
fs.writeFileSync(outPath, body, 'utf8');
console.log('sync-agentstack-core-version:', version, '→', path.relative(corePackageRoot, outPath));
