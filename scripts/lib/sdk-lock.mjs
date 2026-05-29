import fs from 'node:fs';
import path from 'node:path';
import { SDK_LOCK_FILE, DEFAULT_NPM_FILE_LINKS } from './sdk-submodule-constants.mjs';

export function readSdkLock(targetRoot) {
  const p = path.join(targetRoot, SDK_LOCK_FILE);
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

export function writeSdkLock(targetRoot, lock) {
  const p = path.join(targetRoot, SDK_LOCK_FILE);
  fs.writeFileSync(p, `${JSON.stringify(lock, null, 2)}\n`, 'utf8');
}

export function readSdkVersionFromSubmodule(targetRoot, sdkRootRel) {
  const pkg = path.join(targetRoot, sdkRootRel, 'packages', 'core', 'package.json');
  const j = JSON.parse(fs.readFileSync(pkg, 'utf8'));
  return String(j.version || '').trim();
}

export function buildSdkLock({
  sdkRootRel,
  sdkVersion,
  url,
  ref,
  refName,
  npmLink,
}) {
  return {
    lockSchemaVersion: 1,
    sdkId: 'agentstack-sdk',
    sdkVersion,
    sdkRootRel,
    sdkSource: {
      type: 'submodule',
      path: sdkRootRel,
      url,
      ref,
      refType: 'commit',
      refName: refName || undefined,
    },
    npmLink: npmLink || DEFAULT_NPM_FILE_LINKS(sdkRootRel),
    installedAt: new Date().toISOString(),
  };
}
