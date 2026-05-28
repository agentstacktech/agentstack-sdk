import type { HTTPClient } from '../../client/http-client';
import type { CatalogHint } from './types';

export async function getCatalogHints(
  client: HTTPClient,
  projectId: number,
  assetIds?: string[],
): Promise<{ hints: CatalogHint[] }> {
  const response = await client.get('/commerce/guidance/catalog-hints', {
    project_id: projectId,
    asset_ids: assetIds?.length ? assetIds.join(',') : undefined,
  });
  const data = response.data ?? response;
  return { hints: (data.hints ?? []) as CatalogHint[] };
}
