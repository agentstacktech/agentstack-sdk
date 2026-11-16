/** Hosted commerce runtime helpers — all tenant `/s/` + embed surfaces. Gene: sdk.commerce.hosted.gen1 */
export {
  HOSTED_SESSION_TOKEN_KEY,
  HOSTED_SESSION_WORKSPACE_KEY,
  clearHostedSession,
  normalizeBearerToken,
  readHostedSessionToken,
  readHostedWorkspaceProjectId,
  resolveSessionBearerToken,
  storeHostedSession,
  markHostedPostLoginGrace,
  isHostedPostLoginGraceActive,
  type SessionTokenPayload,
} from './sessionVault';

export {
  resolveHostedFlagshipProjectId,
  resolveHostedProjectId,
  resolveHostedProjectIdFromLocation,
  resolveHostedWorkspaceProjectIdFromLogin,
  type HostedBootManifest,
} from './projectContext';

export { buildHostedCommerceHeaders } from './requestHeaders';

export { probeHostedSession, type ProbeHostedSessionOptions } from './sessionProbe';

export {
  bootstrapHostedPlayerSession,
  ensureHostedPlayerMcpReady,
  hostedMcpCookieMinted,
  markHostedMcpCookieMinted,
  isHostedTenantPath,
  mintHostedAppSession,
  type HostedPlayerBootstrapDeps,
  type MintHostedAppSessionOptions,
} from './hostedAppSession';

export {
  HOSTED_MCP_RECOVERABLE_CODES,
  hostedRunPhase,
  isHostedMcpRetryableError,
  mapHostedMcpPlayerError,
  type HostedMcpPlayerError,
  type HostedRunPhase,
} from './hostedMcpPlayerError';

export {
  HOSTED_BATCH_PREVIEW_SHA,
  patchHostedProjectLeafCAS,
  readHostedProjectLeaf,
  type HostedSharedDataOptions,
} from './hostedSharedData';

export {
  executeHostedMcpSteps,
  executeHostedMcpStepsWithRetry,
  type ExecuteHostedMcpStepsOptions,
  type ExecuteHostedMcpStepsRetryOptions,
  type HostedMcpStepSpec,
} from './executeHostedMcpSteps';

export {
  createHostedWire,
  type CreateHostedWireOptions,
  type HostedScriptRunParams,
  type HostedWire,
} from './hostedScriptRun';

export { warmHostedCsrfCookie } from './csrfWarmup';

export {
  HOSTED_CHECKOUT_INTENT_KEY,
  createHostedCheckoutIntent,
  writeHostedCheckoutIntent,
  type CreateHostedCheckoutIntentInput,
  type CreateHostedCheckoutIntentResult,
  type HostedCheckoutIntent,
} from './checkoutIntent';

export {
  loadHostedListings,
  mapHostedListingRow,
  type HostedListingCard,
  type LoadHostedListingsParams,
} from './listings';
