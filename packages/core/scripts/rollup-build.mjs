/**
 * Run Rollup with an elevated Node heap for the large SDK bundle graph.
 * Resolves rollup from workspace hoisted node_modules (not only packages/core/node_modules).
 */
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const rollupBin = require.resolve('rollup/dist/bin/rollup');
const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const result = spawnSync(
  process.execPath,
  ['--max-old-space-size=8192', rollupBin, '-c'],
  { stdio: 'inherit', cwd: packageRoot },
);

process.exit(result.status ?? 1);
