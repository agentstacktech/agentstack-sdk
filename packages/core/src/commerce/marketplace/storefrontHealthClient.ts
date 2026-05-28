import type { HTTPClient } from '../../client/http-client';

export type StorefrontHealth = {
  index_version: number;
  row_count: number;
  authenticated?: boolean;
};

export async function getStorefrontHealth(client: HTTPClient): Promise<StorefrontHealth> {
  const response = await client.get('/commerce/storefront/health');
  const data = response.data ?? response;
  return {
    index_version: Number(data.index_version ?? 0),
    row_count: Number(data.row_count ?? 0),
    authenticated: Boolean(data.authenticated),
  };
}

export async function rebuildStorefrontIndex(client: HTTPClient) {
  const response = await client.post('/commerce/storefront/rebuild-index', {});
  return response.data ?? response;
}
