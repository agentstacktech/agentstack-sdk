import type { HTTPClient } from '../../client/http-client';

export type MerchantShelfStats = {
  active_listings: number;
  orders_7d: number;
  gmv_usdt: string;
};

export async function getMerchantShelfStats(
  client: HTTPClient,
  projectId: number,
): Promise<MerchantShelfStats> {
  const response = await client.get('/commerce/merchant/shelf-stats', {
    project_id: projectId,
  });
  const data = response.data ?? response;
  return {
    active_listings: data.active_listings ?? 0,
    orders_7d: data.orders_7d ?? 0,
    gmv_usdt: String(data.gmv_usdt ?? '0'),
  };
}
