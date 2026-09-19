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
  type SessionTokenPayload,
} from './sessionVault';

export {
  resolveHostedProjectId,
  resolveHostedProjectIdFromLocation,
  type HostedBootManifest,
} from './projectContext';

export { buildHostedCommerceHeaders } from './requestHeaders';

export { probeHostedSession, type ProbeHostedSessionOptions } from './sessionProbe';

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
