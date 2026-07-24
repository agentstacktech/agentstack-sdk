import type { HTTPClient } from '../../client/http-client';

export type StorefrontHealth = {
  index_version: number;
  row_count: number;
  authenticated?: boolean;
  ecs_has_data?: boolean;
  ecs_global_count?: number;
  ecs_global_initialized?: boolean;
  read_model?: string;
};

export async function getStorefrontHealth(client: HTTPClient): Promise<StorefrontHealth> {
  const response = await client.get('/commerce/storefront/health');
  const data = response.data ?? response;
  return {
    index_version: Number(data.index_version ?? 0),
    row_count: Number(data.row_count ?? 0),
    authenticated: Boolean(data.authenticated),
    ecs_has_data:
      data.ecs_has_data === undefined ? undefined : Boolean(data.ecs_has_data),
    ecs_global_count:
      data.ecs_global_count === undefined
        ? undefined
        : Number(data.ecs_global_count ?? 0),
    ecs_global_initialized:
      data.ecs_global_initialized === undefined
        ? undefined
        : Boolean(data.ecs_global_initialized),
    read_model: data.read_model ? String(data.read_model) : undefined,
  };
}

export async function rebuildStorefrontIndex(client: HTTPClient) {
  const response = await client.post('/commerce/storefront/rebuild-index', {});
  return response.data ?? response;
}
