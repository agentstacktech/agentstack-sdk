#!/usr/bin/env node
/**
 * `@agentstack/sdk/pwa` subpath gzip budget (`sdk.pwa.update_plane.gen2`).
 */
import { readFileSync, existsSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const TARGET = join(ROOT, 'dist', 'pwa', 'index.esm.js');
const MAX_GZIP_KB = 12;

if (!existsSync(TARGET)) {
  console.error('check-pwa-subpath-size: run `npm run build` in packages/core first');
  process.exit(1);
}

const raw = readFileSync(TARGET);
const gzipKb = gzipSync(raw).length / 1024;
if (gzipKb > MAX_GZIP_KB) {
  console.error(`check-pwa-subpath-size: ${gzipKb.toFixed(1)}kb gzip > ${MAX_GZIP_KB}kb`);
  process.exit(1);
}

console.log(`check-pwa-subpath-size: ok (${gzipKb.toFixed(1)}kb gzip)`);
