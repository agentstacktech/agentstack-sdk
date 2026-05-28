import type { Listing } from '../../types';

export function normalizeMarketplaceListingsResponse(response: {
  listings?: unknown[];
  total?: number;
}): { listings: Listing[]; total: number } {
  const listings = (response.listings || []).map((item: unknown) => {
    const row = item as Record<string, unknown>;
    const listingData =
      (row.listing as Record<string, unknown> | undefined) ||
      ({
        type: row.listing_type || row.type || 'sell',
        status: row.status || 'active',
        asset: row.asset || row.asset_card || {},
      } as Record<string, unknown>);

    return {
      uuid: row.listing_uuid || row.uuid,
      project_id: row.seller_project_id ?? row.project_id,
      user_id: row.user_id ?? listingData.seller_id,
      listing: {
        ...listingData,
        type: (listingData.type as string) || 'sell',
        status: (listingData.status as string) || 'active',
        asset: (listingData.asset as Record<string, unknown>) || {},
      },
      deal: row.deal,
      created_at: row.created_at,
      updated_at: row.updated_at,
      asset_card: row.asset_card,
    } as unknown as Listing;
  });

  return { listings, total: response.total ?? listings.length };
}
