/**
 * Public (unauthenticated) SDK surfaces.
 */

export { PublicGrantsClient } from './grants';
export { PublicShowcaseClient, getPublicShowcaseCatalog } from './showcase/PublicShowcaseClient';
export type {
  PublicShowcaseCatalogEntry,
  PublicShowcaseCatalogResponse,
  PublicShowcaseEntryKind,
} from './showcase/PublicShowcaseClient';
export type {
  PublicGrantsSnapshot,
  PublicGrantsGrsSlice,
  PublicGrantsBlocker,
  PublicGrantsProofTiers,
  PublicContractLink,
  PublicChainSurfacePayload,
  PublicBatchProofPayload,
} from './grants';

import type { HTTPClient } from '../client/http-client';
import { PublicGrantsClient } from './grants';
import { PublicShowcaseClient } from './showcase/PublicShowcaseClient';

/** Root `sdk.public` namespace. */
export class AgentPublicSurface {
  readonly grants: PublicGrantsClient;
  readonly showcase: PublicShowcaseClient;

  constructor(http: HTTPClient) {
    this.grants = new PublicGrantsClient(http);
    this.showcase = new PublicShowcaseClient(http);
  }
}
