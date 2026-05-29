import assert from 'node:assert/strict';
import { buildSdkLock } from '../scripts/lib/sdk-lock.mjs';
import { DEFAULT_NPM_FILE_LINKS, sdkReleaseTag } from '../scripts/lib/sdk-submodule-constants.mjs';

const lock = buildSdkLock({
  sdkRootRel: 'vendor/agentstack-sdk',
  sdkVersion: '0.4.13',
  url: 'https://github.com/agentstacktech/agentstack-sdk.git',
  ref: 'a'.repeat(40),
  refName: 'v0.4.13',
});

assert.equal(lock.lockSchemaVersion, 1);
assert.equal(lock.sdkSource.type, 'submodule');
assert.equal(lock.npmLink['@agentstack/sdk'], 'file:vendor/agentstack-sdk/packages/core');
assert.equal(sdkReleaseTag('0.4.13'), 'v0.4.13');

console.log('sdk-submodule-lock.test.mjs: ok');
