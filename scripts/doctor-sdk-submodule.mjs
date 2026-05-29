#!/usr/bin/env node
/**
 * Validate SDK submodule + sdk.lock.json + optional build artifacts.
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { detectSubmoduleDrift, sdkSubmoduleLooksValid } from './lib/git-submodule.mjs';
import { readSdkLock } from './lib/sdk-lock.mjs';

function parseArgs(argv) {
  const opts = { target: '.', build: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--target') opts.target = argv[++i];
    else if (a === '--build') opts.build = true;
    else if (a === '--help') {
      console.log('Usage: node doctor-sdk-submodule.mjs --target <repo> [--build]');
      process.exit(0);
    }
  }
  return { ...opts, target: path.resolve(opts.target) };
}

function main() {
  const opts = parseArgs(process.argv);
  const lock = readSdkLock(opts.target);
  if (!lock?.sdkSource?.path) {
    console.error('Missing sdk.lock.json — run submodule-add-sdk.mjs first');
    process.exit(1);
  }

  const root = lock.sdkRootRel || lock.sdkSource.path;
  if (!sdkSubmoduleLooksValid(opts.target, root)) {
    console.error(`Submodule invalid at ${root} (expected packages/core/package.json)`);
    process.exit(1);
  }

  const drift = detectSubmoduleDrift(opts.target, lock.sdkSource, { strict: true });
  if (drift.drift) {
    console.error('Submodule drift:', drift);
    process.exit(1);
  }

  const distCore = path.join(opts.target, root, 'packages', 'core', 'dist', 'index.js');
  if (!fs.existsSync(distCore)) {
    console.warn('WARN: packages/core/dist not built — run: cd', path.join(root), '&& npm install && npm run build');
    if (opts.build) {
      const r = spawnSync('npm', ['run', 'build'], {
        cwd: path.join(opts.target, root),
        stdio: 'inherit',
        shell: true,
      });
      if (r.status !== 0) process.exit(r.status ?? 1);
    } else {
      process.exit(1);
    }
  }

  console.log(`doctor-sdk-submodule OK sdkVersion=${lock.sdkVersion} ref=${lock.sdkSource.ref.slice(0, 7)}`);
}

main();
