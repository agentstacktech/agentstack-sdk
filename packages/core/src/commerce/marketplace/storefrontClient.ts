import type { HTTPClient } from '../../client/http-client';
import { normalizeMarketplaceListingsResponse } from './normalizeListingsResponse';

export type ListStorefrontParams = {
  scope?: 'global' | 'project';
  project_id?: number;
  type?: string;
  search?: string;
  sort?: 'recent' | 'price_asc' | 'price_desc' | 'recommended';
  category?: string;
  collection?: string;
  page?: number;
  limit?: number;
};

export async function listStorefrontListings(
  client: HTTPClient,
  params?: ListStorefrontParams,
) {
  const response = await client.get('/commerce/storefront/listings', params);
  const data = response.data ?? response;
  const normalized = normalizeMarketplaceListingsResponse({
    listings: data.listings,
    total: data.total,
  });
  return {
    ...normalized,
    index_version: data.index_version,
    count: data.count,
    facet_counts: data.facet_counts as Record<string, Record<string, number>> | undefined,
  };
}
