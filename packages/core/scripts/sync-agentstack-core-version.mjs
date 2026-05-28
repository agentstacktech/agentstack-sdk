/**
 * Reads AGENTSTACK_CORE_VERSION from monorepo shared/constants.py and writes
 * src/generated/agentstack-core-version.ts so @agentstack/sdk stays aligned with Core.
 *
 * Run: npm run sync:agentstack-version (also prebuild / pretest / pretype-check).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const corePackageRoot = path.resolve(__dirname, '..');
const constantsPath = path.resolve(corePackageRoot, '../../../shared/constants.py');
const outPath = path.resolve(corePackageRoot, 'src/generated/agentstack-core-version.ts');

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
fs.writeFileSync(outPath, body, 'utf8');
console.log('sync-agentstack-core-version:', version, '→', path.relative(corePackageRoot, outPath));
