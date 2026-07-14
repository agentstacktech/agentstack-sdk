/**
 * Public (unauthenticated) SDK surfaces.
 */

export { PublicGrantsClient } from './grants';
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

/** Root `sdk.public` namespace. */
export class AgentPublicSurface {
  readonly grants: PublicGrantsClient;

  constructor(http: HTTPClient) {
    this.grants = new PublicGrantsClient(http);
  }
}
