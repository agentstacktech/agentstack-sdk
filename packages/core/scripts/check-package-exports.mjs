#!/usr/bin/env node
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const pkgDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(readFileSync(join(pkgDir, 'package.json'), 'utf8'));
const exportsKeys = new Set(Object.keys(pkg.exports ?? {}));

const required = [
  '.',
  './capability-tasks',
  './manifest',
  './economy',
  './guidance',
  './commerce',
  './pwa',
  './mobile',
  './logic/blueprints',
  './mcp',
  './workspace',
  './diagnostics',
  './messaging',
  './services',
];

const srcExports = Object.entries(pkg.exports ?? {}).filter(([, v]) => {
  const target = typeof v === 'string' ? v : v.import || v.require || v.default || '';
  return String(target).includes('/src/');
});
if (srcExports.length) {
  console.error('check-package-exports: exports must point at dist/, not src/:', srcExports.map(([k]) => k).join(', '));
  process.exit(1);
}

const missing = required.filter((k) => !exportsKeys.has(k));
if (missing.length) {
  console.error('check-package-exports: missing exports:', missing.join(', '));
  process.exit(1);
}

console.log('check-package-exports: ok');
