#!/usr/bin/env node
/**
 * One-shot: submodule add + sdk.lock + package.json file: links + optional build.
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

function parseArgs(argv) {
  const opts = { target: '.', tag: null, shallow: false, skipBuild: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--target') opts.target = argv[++i];
    else if (a === '--tag') opts.tag = argv[++i];
    else if (a === '--shallow') opts.shallow = true;
    else if (a === '--skip-build') opts.skipBuild = true;
    else if (a === '--help') {
      console.log(`Usage: node bootstrap-submodule-consumer.mjs --target <repo> [--tag v0.4.13]`);
      process.exit(0);
    }
  }
  return { ...opts, target: path.resolve(opts.target) };
}

function run(nodeScript, args, cwd) {
  const r = spawnSync(process.execPath, [nodeScript, ...args], { cwd, stdio: 'inherit' });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

function main() {
  const opts = parseArgs(process.argv);
  const scriptsDir = path.dirname(fileURLToPath(import.meta.url));

  const addArgs = ['--target', opts.target];
  if (opts.tag) addArgs.push('--tag', opts.tag);
  if (opts.shallow) addArgs.push('--shallow');

  run(path.join(scriptsDir, 'submodule-add-sdk.mjs'), addArgs, process.cwd());
  run(path.join(scriptsDir, 'link-sdk-deps.mjs'), ['--target', opts.target], process.cwd());

  const doctorArgs = ['--target', opts.target];
  if (!opts.skipBuild) doctorArgs.push('--build');
  run(path.join(scriptsDir, 'doctor-sdk-submodule.mjs'), doctorArgs, process.cwd());

  console.log('bootstrap-submodule-consumer OK');
}

main();
