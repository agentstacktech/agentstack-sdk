/**
 * Run Rollup with a Node heap sized for the host (deploy preflight caps at 4 GB on tight disks).
 * Resolves rollup from workspace hoisted node_modules (not only packages/core/node_modules).
 */
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const rollupBin = require.resolve('rollup/dist/bin/rollup');
const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function resolveRollupHeapMb() {
  /** Rollup graph OOMs below ~6 GB; never inherit a 4 GB NODE_OPTIONS cap from vite/docker. */
  const minSdkMb = 6144;
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

const heapMb = resolveRollupHeapMb();
const childEnv = { ...process.env };
if (childEnv.NODE_OPTIONS) {
  childEnv.NODE_OPTIONS = childEnv.NODE_OPTIONS
    .replace(/(?:^|\s)--max-old-space-size=\d+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!childEnv.NODE_OPTIONS) delete childEnv.NODE_OPTIONS;
}
const result = spawnSync(
  process.execPath,
  [`--max-old-space-size=${heapMb}`, rollupBin, '-c'],
  { stdio: 'inherit', cwd: packageRoot, env: childEnv },
);

process.exit(result.status ?? 1);
