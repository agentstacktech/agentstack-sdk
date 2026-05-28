import type { HTTPClient } from '../../client/http-client';
import type { IncomingOrderRow, MerchantListingRow, SellerDashboard } from './types';

export interface MerchantHubSnapshot {
  dashboard: SellerDashboard;
  listings: MerchantListingRow[];
  listings_total: number;
  orders: IncomingOrderRow[];
  orders_total: number;
}

export async function getMerchantHubSnapshot(
  client: HTTPClient,
  projectId: number,
  opts?: { listingsLimit?: number; ordersLimit?: number },
): Promise<MerchantHubSnapshot> {
  const response = await client.get('/commerce/merchant/hub-snapshot', {
    project_id: projectId,
    listings_limit: opts?.listingsLimit ?? 100,
    orders_limit: opts?.ordersLimit ?? 100,
  });
  const data = response.data ?? response;
  return {
    dashboard: (data.dashboard ?? {}) as SellerDashboard,
    listings: (data.listings ?? []) as MerchantListingRow[],
    listings_total: data.listings_total ?? 0,
    orders: (data.orders ?? []) as IncomingOrderRow[],
    orders_total: data.orders_total ?? 0,
  };
}
