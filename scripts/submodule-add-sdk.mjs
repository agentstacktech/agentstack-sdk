#!/usr/bin/env node
/**
 * Add or update git submodule for @agentstack/sdk public mirror.
 * Genetic tag: repo.platform.sdk.submodule.gen1
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  DEFAULT_SDK_SUBMODULE_PATH,
  DEFAULT_SDK_REPO_URL,
  SDK_LOCK_FILE,
  sdkReleaseTag,
} from './lib/sdk-submodule-constants.mjs';
import { ensureSubmoduleAtRef, resolveRemoteTagToSha } from './lib/git-submodule.mjs';
import { buildSdkLock, readSdkVersionFromSubmodule, writeSdkLock } from './lib/sdk-lock.mjs';

function parseArgs(argv) {
  const opts = {
    target: '.',
    path: DEFAULT_SDK_SUBMODULE_PATH,
    url: DEFAULT_SDK_REPO_URL,
    ref: null,
    tag: null,
    shallow: false,
    skipLock: false,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--target') opts.target = argv[++i];
    else if (a === '--path') opts.path = argv[++i];
    else if (a === '--url') opts.url = argv[++i];
    else if (a === '--ref') opts.ref = argv[++i];
    else if (a === '--tag') opts.tag = argv[++i];
    else if (a === '--shallow') opts.shallow = true;
    else if (a === '--skip-lock') opts.skipLock = true;
    else if (a === '--help') {
      console.log(`Usage: node submodule-add-sdk.mjs --target <repo> [options]

Options:
  --path vendor/agentstack-sdk   Submodule path (default)
  --tag v0.4.13                  Release tag on agentstacktech/agentstack-sdk
  --ref <sha>                    Pin commit (overrides --tag)
  --shallow                      Shallow clone
  --skip-lock                    Do not write sdk.lock.json

See docs/SUBMODULE_CONSUMER.md`);
      process.exit(0);
    }
  }
  return { ...opts, target: path.resolve(opts.target) };
}

function resolveRef(opts) {
  if (opts.ref) return opts.ref;
  const envRef = process.env.AGENTSTACK_SDK_REF?.trim();
  if (envRef && /^[0-9a-f]{40}$/i.test(envRef)) return envRef;
  const tag = opts.tag || process.env.AGENTSTACK_SDK_TAG?.trim();
  if (tag) {
    const normalizedTag = tag.startsWith('v') ? tag : sdkReleaseTag(tag);
    const sha = resolveRemoteTagToSha(normalizedTag, opts.url);
    if (sha) return sha;
    throw new Error(`Could not resolve tag ${tag} on ${opts.url}`);
  }
  const existing = path.join(opts.target, opts.path, 'packages', 'core', 'package.json');
  if (fs.existsSync(existing)) {
    const ver = JSON.parse(fs.readFileSync(existing, 'utf8')).version;
    const sha = resolveRemoteTagToSha(sdkReleaseTag(ver), opts.url);
    if (sha) return sha;
  }
  return null;
}

function main() {
  const opts = parseArgs(process.argv);
  const gitCheck = spawnSync('git', ['rev-parse', '--is-inside-work-tree'], {
    cwd: opts.target,
    encoding: 'utf8',
  });
  if (gitCheck.status !== 0) {
    console.error('Target is not a git repository.');
    process.exit(1);
  }

  const ref = resolveRef(opts);
  const sha = ensureSubmoduleAtRef(opts.target, {
    url: opts.url,
    path: opts.path,
    ref: ref || undefined,
    shallow: opts.shallow,
  });

  if (!opts.skipLock) {
    const sdkVersion = readSdkVersionFromSubmodule(opts.target, opts.path);
    const lock = buildSdkLock({
      sdkRootRel: opts.path,
      sdkVersion,
      url: opts.url,
      ref: sha || ref || readSubmoduleRefFallback(opts.target, opts.path),
      refName: opts.tag || (sdkVersion ? sdkReleaseTag(sdkVersion) : undefined),
    });
    writeSdkLock(opts.target, lock);
    console.log(`Wrote ${SDK_LOCK_FILE} sdkVersion=${sdkVersion} ref=${lock.sdkSource.ref.slice(0, 7)}`);
  }

  console.log(`submodule-add-sdk OK path=${opts.path}`);
}

function readSubmoduleRefFallback(targetRoot, submodulePath) {
  const r = spawnSync('git', ['rev-parse', `${submodulePath}^{commit}`], {
    cwd: targetRoot,
    encoding: 'utf8',
  });
  return r.stdout?.trim() || '';
}

main();
