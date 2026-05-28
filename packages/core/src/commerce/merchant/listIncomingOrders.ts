import type { HTTPClient } from '../../client/http-client';
import type { IncomingOrderRow } from './types';

export async function listIncomingOrders(
  client: HTTPClient,
  projectId: number,
  opts?: { page?: number; limit?: number },
): Promise<{ orders: IncomingOrderRow[]; total: number }> {
  const response = await client.get('/commerce/merchant/orders-incoming', {
    project_id: projectId,
    page: opts?.page ?? 1,
    limit: opts?.limit ?? 50,
  });
  const data = response.data ?? response;
  return {
    orders: (data.orders ?? []) as IncomingOrderRow[],
    total: data.total ?? 0,
  };
}
