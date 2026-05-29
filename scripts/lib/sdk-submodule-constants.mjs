/** Default consumer submodule layout for @agentstack/sdk mirror. */
export const DEFAULT_SDK_SUBMODULE_PATH = 'vendor/agentstack-sdk';

export const DEFAULT_SDK_REPO_URL = 'https://github.com/agentstacktech/agentstack-sdk.git';

export const SDK_LOCK_FILE = 'sdk.lock.json';

/** Allowed hosts for `git submodule add` (override via SDK_SUBMODULE_URL_ALLOWLIST_EXTRA). */
export const ALLOWED_SDK_REPO_HOSTS = [
  'github.com/agentstacktech/agentstack-sdk',
];

/** Release tag on public mirror: v{semver} (matches AGENTSTACK_CORE_VERSION). */
export function sdkReleaseTag(semver) {
  const v = String(semver || '').trim().replace(/^v/i, '');
  return `v${v}`;
}

export const DEFAULT_NPM_FILE_LINKS = (sdkRootRel) => ({
  '@agentstack/sdk': `file:${sdkRootRel}/packages/core`,
  '@agentstack/react': `file:${sdkRootRel}/packages/react`,
  '@agentstack/hooks': `file:${sdkRootRel}/packages/hooks`,
});
