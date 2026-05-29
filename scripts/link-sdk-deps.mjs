#!/usr/bin/env node
/**
 * Wire consumer package.json to SDK submodule via file: dependencies.
 */
import fs from 'node:fs';
import path from 'node:path';
import { DEFAULT_NPM_FILE_LINKS } from './lib/sdk-submodule-constants.mjs';
import { readSdkLock } from './lib/sdk-lock.mjs';

function parseArgs(argv) {
  const opts = { target: '.', packageJson: 'package.json', dryRun: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--target') opts.target = argv[++i];
    else if (a === '--package-json') opts.packageJson = argv[++i];
    else if (a === '--dry-run') opts.dryRun = true;
    else if (a === '--help') {
      console.log('Usage: node link-sdk-deps.mjs --target <repo> [--package-json path]');
      process.exit(0);
    }
  }
  return { ...opts, target: path.resolve(opts.target) };
}

function main() {
  const opts = parseArgs(process.argv);
  const pkgPath = path.join(opts.target, opts.packageJson);
  if (!fs.existsSync(pkgPath)) {
    console.error(`Missing ${opts.packageJson}`);
    process.exit(1);
  }

  const lock = readSdkLock(opts.target);
  const links = lock?.npmLink ?? DEFAULT_NPM_FILE_LINKS('vendor/agentstack-sdk');

  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  pkg.dependencies = pkg.dependencies || {};
  for (const [name, spec] of Object.entries(links)) {
    pkg.dependencies[name] = spec;
  }

  const out = `${JSON.stringify(pkg, null, 2)}\n`;
  if (opts.dryRun) {
    console.log(out);
    return;
  }
  fs.writeFileSync(pkgPath, out, 'utf8');
  console.log(`link-sdk-deps OK updated ${opts.packageJson}`);
}

main();
