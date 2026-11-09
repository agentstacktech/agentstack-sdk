/** Default consumer submodule layout for @agentstack/sdk mirror. */
export const DEFAULT_SDK_SUBMODULE_PATH = 'vendor/agentstack-sdk';

export const DEFAULT_SDK_REPO_URL = 'https://github.com/agentstacktech/agentstack-sdk.git';

/** Same tree on AgentStack smart HTTP git (project 1 bucket ``sdk``). */
export const AGENTSTACK_GIT_SDK_URL = 'https://agentstack.tech/api/git/1/sdk.git';

/** UI package journal (project 1 bucket ``shared-ui``). */
export const AGENTSTACK_GIT_SHARED_UI_URL = 'https://agentstack.tech/api/git/1/shared-ui.git';

export const SDK_LOCK_FILE = 'sdk.lock.json';

/** Allowed hosts for `git submodule add` (override via SDK_SUBMODULE_URL_ALLOWLIST_EXTRA). */
export const ALLOWED_SDK_REPO_HOSTS = [
  'github.com/agentstacktech/agentstack-sdk',
  'agentstack.tech/api/git/1/sdk',
  'agentstack.tech/api/git/1/shared-ui',
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
