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
  isHostedTenantPath,
  mintHostedAppSession,
  type HostedPlayerBootstrapDeps,
  type MintHostedAppSessionOptions,
} from './hostedAppSession';

export { mapHostedMcpPlayerError, type HostedMcpPlayerError } from './hostedMcpPlayerError';

export {
  patchHostedProjectLeafCAS,
  readHostedProjectLeaf,
  type HostedSharedDataOptions,
} from './hostedSharedData';

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
