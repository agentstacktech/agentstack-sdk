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
import { PublicChangelogClient } from './changelog';
import { PublicGrantsClient } from './grants';
import { PublicShowcaseClient } from './showcase/PublicShowcaseClient';

function resolvePublicSiteOrigin(http: HTTPClient): string {
  const cfg = (http as unknown as { config?: { apiBase?: string; baseUrl?: string } })
    .config;
  const base = (cfg?.apiBase || cfg?.baseUrl || '').trim().replace(/\/$/, '');
  if (base.endsWith('/api')) {
    return base.slice(0, -4);
  }
  if (base) {
    return base;
  }
  if (typeof globalThis !== 'undefined' && 'location' in globalThis) {
    const loc = (globalThis as { location?: { origin?: string } }).location;
    if (loc?.origin) {
      return loc.origin;
    }
  }
  return 'https://agentstack.tech';
}

/** Root `sdk.public` namespace. */
export class AgentPublicSurface {
  readonly grants: PublicGrantsClient;
  readonly showcase: PublicShowcaseClient;
  readonly changelog: PublicChangelogClient;

  constructor(http: HTTPClient) {
    this.grants = new PublicGrantsClient(http);
    this.showcase = new PublicShowcaseClient(http);
    this.changelog = new PublicChangelogClient(resolvePublicSiteOrigin(http));
  }
}

export {
  PublicChangelogClient,
  changelogPaths,
  changelogUrl,
  fetchChangelogFeed,
  unseenItems,
} from './changelog';
export type { ChangelogFeedV1, ChangelogFeedItemV1 } from './changelog';
