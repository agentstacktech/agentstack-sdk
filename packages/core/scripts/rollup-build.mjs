/**
 * Run Rollup with a Node heap sized for the host (deploy preflight caps at 4 GB on tight disks).
 * Each config runs in a fresh child process so d.ts graphs do not accumulate heap (guidance OOM).
 * Resolves rollup from workspace hoisted node_modules (not only packages/core/node_modules).
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  computeSdkBuildInputHash,
  isSdkBuildStampFresh,
  packageRoot,
  readStoredBuildInputHash,
  writeStoredBuildInputHash,
} from './sdk-build-input-hash.mjs';

const require = createRequire(import.meta.url);
const rollupBin = require.resolve('rollup/dist/bin/rollup');
const runOneScript = path.join(path.dirname(fileURLToPath(import.meta.url)), 'rollup-run-one.mjs');

function resolveRollupHeapMb() {
  /** Monolithic rollup -c needed ~6 GB; isolated configs usually fit 4 GB per step. */
  const minSdkMb = 4096;
  let heap = 8192;
  for (const key of ['DEPLOY_SDK_HEAP_MB', 'DEPLOY_NODE_HEAP_MB']) {
    const raw = process.env[key];
    if (raw) {
      const n = Number.parseInt(String(raw), 10);
      if (Number.isFinite(n) && n >= 512) {
        heap = n;
        break;
      }
    }
  }
  if (heap === 8192) {
    const nodeOpts = process.env.NODE_OPTIONS ?? '';
    const match = /--max-old-space-size=(\d+)/.exec(nodeOpts);
    if (match) {
      const n = Number.parseInt(match[1], 10);
      if (Number.isFinite(n) && n >= 512) heap = n;
    }
  }
  if (process.env.CI === 'true' || process.env.DEPLOY_CONSTRAINED_HOST === '1') {
    heap = Math.min(heap, 8192);
  }
  if (heap < minSdkMb) heap = minSdkMb;
  return heap;
}

function stripNodeOptionsHeap(nodeOptions) {
  if (!nodeOptions) return undefined;
  const cleaned = nodeOptions
    .replace(/(?:^|\s)--max-old-space-size=\d+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned || undefined;
}

const heapMb = resolveRollupHeapMb();
const childEnv = { ...process.env, ROLLUP_ISOLATED_CONFIGS: '1' };
const stripped = stripNodeOptionsHeap(childEnv.NODE_OPTIONS);
if (stripped) childEnv.NODE_OPTIONS = stripped;
else delete childEnv.NODE_OPTIONS;

const legacyMonolith = process.env.ROLLUP_BUILD_MONOLITH === '1';

function trySkipFullBuildViaInputHash() {
  if (legacyMonolith || process.env.ROLLUP_FORCE_ALL === '1') {
    return false;
  }
  if (process.env.ROLLUP_SKIP_INPUT_HASH === '0') {
    return false;
  }
  const marker = path.join(packageRoot, 'dist', 'index.esm.js');
  if (!fs.existsSync(marker) || fs.statSync(marker).size < 512) {
    return false;
  }
  if (!readStoredBuildInputHash() || !isSdkBuildStampFresh()) {
    return false;
  }
  console.log('rollup-build: skip (dist matches .sdk-build-inputs.sha256)');
  return true;
}

async function configCount() {
  const configUrl = pathToFileURL(path.join(packageRoot, 'rollup.config.js')).href;
  const { default: configs } = await import(configUrl);
  return Array.isArray(configs) ? configs.length : 1;
}

function runChild(index, total) {
  return spawnSync(
    process.execPath,
    [`--max-old-space-size=${heapMb}`, runOneScript],
    {
      stdio: 'inherit',
      cwd: packageRoot,
      env: {
        ...childEnv,
        ROLLUP_CONFIG_INDEX: String(index),
        ROLLUP_CONFIG_TOTAL: String(total),
      },
    },
  );
}

if (legacyMonolith) {
  const result = spawnSync(
    process.execPath,
    [`--max-old-space-size=${heapMb}`, rollupBin, '-c'],
    { stdio: 'inherit', cwd: packageRoot, env: childEnv },
  );
  process.exit(result.status ?? 1);
}

if (trySkipFullBuildViaInputHash()) {
  process.exit(0);
}

const total = await configCount();
for (let i = 0; i < total; i++) {
  const result = runChild(i, total);
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
writeStoredBuildInputHash(computeSdkBuildInputHash());
process.exit(0);
