import type { HTTPClient } from '../../client/http-client';

export type BulkListingItem = {
  type?: string;
  asset: unknown;
  whitelist?: Record<string, unknown>;
  auto_accept?: Record<string, unknown>;
};

export async function bulkCreateListings(
  client: HTTPClient,
  projectId: number,
  body: { items: BulkListingItem[] },
) {
  const response = await client.post('/commerce/marketplace/listings/bulk', body, {
    headers: { 'X-Project-ID': String(projectId) },
  });
  return response.data ?? response;
}
