#!/usr/bin/env node
/**
 * CI guard: SDK build must use per-config subprocesses (deploy OOM INC 2026-09-25).
 * Gene: repo.platform.sdk.ai_surface.gen1
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const buildScript = path.join(root, 'scripts', 'rollup-build.mjs');
const runOne = path.join(root, 'scripts', 'rollup-run-one.mjs');

if (!fs.existsSync(runOne)) {
  console.error('missing rollup-run-one.mjs');
  process.exit(1);
}
const src = fs.readFileSync(buildScript, 'utf8');
if (!src.includes('rollup-run-one.mjs') || !src.includes('ROLLUP_CONFIG_INDEX')) {
  console.error('rollup-build.mjs must default to isolated configs (rollup-run-one.mjs)');
  process.exit(1);
}
console.log('check-rollup-build-isolated: OK');
