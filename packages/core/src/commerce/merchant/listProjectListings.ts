import type { HTTPClient } from '../../client/http-client';
import type { ListProjectListingsParams, MerchantListingRow } from './types';

export async function listProjectListings(
  client: HTTPClient,
  params: ListProjectListingsParams,
): Promise<{ listings: MerchantListingRow[]; total: number; page: number; limit: number }> {
  const response = await client.get('/commerce/merchant/listings', {
    project_id: params.projectId,
    status: params.status,
    search: params.search,
    stale_only: params.staleOnly,
    asset_id: params.assetId,
    asset_ids: params.assetIds?.length ? params.assetIds.join(',') : undefined,
    visibility: params.visibility,
    page: params.page ?? 1,
    limit: params.limit ?? 50,
  });
  const data = response.data ?? response;
  return {
    listings: (data.listings ?? []) as MerchantListingRow[],
    total: data.total ?? 0,
    page: data.page ?? 1,
    limit: data.limit ?? 50,
  };
}
