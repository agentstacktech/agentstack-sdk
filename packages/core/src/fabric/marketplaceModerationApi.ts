/**
 * Capability Marketplace moderation REST client (`sdk.fabric.gen1`, B19).
 */
import type { HTTPClient } from '../client/http-client';
import { unwrapApiData } from '../client/unwrapApiData';
import {
  marketplaceListingSchema,
  type MarketplaceListing,
} from './capabilityMarketplace';

export type PendingMarketplaceModerationResponse = {
  version: number;
  count: number;
  listings: MarketplaceListing[];
};

export type ModerateMarketplaceResponse = {
  success: boolean;
  listing: MarketplaceListing;
};

export async function listPendingMarketplaceModeration(
  http: HTTPClient,
): Promise<PendingMarketplaceModerationResponse> {
  const res = await http.get<PendingMarketplaceModerationResponse>(
    '/capabilities/marketplace/moderation/pending',
  );
  const data = unwrapApiData(res);
  return {
    ...data,
    listings: (data.listings ?? []).map((x) => marketplaceListingSchema.parse(x)),
  };
}

export async function approveMarketplaceListing(
  http: HTTPClient,
  listingId: string,
): Promise<ModerateMarketplaceResponse> {
  const res = await http.post<ModerateMarketplaceResponse>(
    `/capabilities/marketplace/${encodeURIComponent(listingId)}/approve`,
    {},
  );
  const data = unwrapApiData(res);
  return {
    ...data,
    listing: marketplaceListingSchema.parse(data.listing),
  };
}

export async function rejectMarketplaceListing(
  http: HTTPClient,
  listingId: string,
  reason: string = '',
): Promise<ModerateMarketplaceResponse> {
  const res = await http.post<ModerateMarketplaceResponse>(
    `/capabilities/marketplace/${encodeURIComponent(listingId)}/reject`,
    { reason },
  );
  const data = unwrapApiData(res);
  return {
    ...data,
    listing: marketplaceListingSchema.parse(data.listing),
  };
}
