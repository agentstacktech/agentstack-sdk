import type { HTTPClient } from '../../client/http-client';
import type { ListingDraftDefaults } from './types';

export async function getListingDraftDefaults(
  client: HTTPClient,
  projectId: number,
  assetId: string,
): Promise<ListingDraftDefaults> {
  const response = await client.get('/commerce/guidance/listing-draft', {
    project_id: projectId,
    asset_id: assetId,
  });
  const data = response.data ?? response;
  return data as ListingDraftDefaults;
}
