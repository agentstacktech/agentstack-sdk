import type { HTTPClient } from '../../client/http-client';
import type { UpdateMerchantListingBody } from './types';

export async function updateMerchantListing(
  client: HTTPClient,
  projectId: number,
  listingUuid: string,
  body: UpdateMerchantListingBody,
): Promise<unknown> {
  const response = await client.put(
    `/commerce/merchant/listings/${listingUuid}`,
    body,
    { project_id: projectId },
  );
  return response.data ?? response;
}

export async function deactivateListing(
  client: HTTPClient,
  projectId: number,
  listingUuid: string,
): Promise<unknown> {
  const response = await client.put(
    `/commerce/merchant/listings/${listingUuid}`,
    { status: 'cancelled' },
    { project_id: projectId },
  );
  return response.data ?? response;
}

export async function syncListingPrice(
  client: HTTPClient,
  projectId: number,
  listingUuid: string,
): Promise<unknown> {
  const response = await client.post(
    `/commerce/merchant/listings/${listingUuid}/sync-price`,
    {},
    { project_id: projectId },
  );
  return response.data ?? response;
}

export async function reindexListing(
  client: HTTPClient,
  projectId: number,
  listingUuid: string,
): Promise<void> {
  await client.post(
    `/commerce/merchant/listings/${listingUuid}/reindex`,
    {},
    { project_id: projectId },
  );
}

export async function bulkSyncStalePrices(
  client: HTTPClient,
  projectId: number,
): Promise<{ synced: string[]; failed: string[]; count: number }> {
  const response = await client.post(
    '/commerce/merchant/listings/bulk-sync-prices',
    {},
    { project_id: projectId },
  );
  const data = response.data ?? response;
  return {
    synced: data.synced ?? [],
    failed: data.failed ?? [],
    count: data.count ?? 0,
  };
}

export async function bulkDeactivateListings(
  client: HTTPClient,
  projectId: number,
  listingUuids: string[],
): Promise<{ deactivated: string[]; failed: string[] }> {
  const response = await client.post(
    '/commerce/merchant/listings/bulk-deactivate',
    { listing_uuids: listingUuids },
    { project_id: projectId },
  );
  const data = response.data ?? response;
  return {
    deactivated: data.deactivated ?? [],
    failed: data.failed ?? [],
  };
}
