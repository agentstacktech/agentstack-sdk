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
];

const missing = required.filter((k) => !exportsKeys.has(k));
if (missing.length) {
  console.error('check-package-exports: missing exports:', missing.join(', '));
  process.exit(1);
}

console.log('check-package-exports: ok');
