import type { HTTPClient } from '../../client/http-client';
import type { SellerDashboard } from './types';

export async function getSellerDashboard(
  client: HTTPClient,
  projectId: number,
): Promise<SellerDashboard> {
  const response = await client.get('/commerce/merchant/dashboard', {
    project_id: projectId,
  });
  const data = response.data ?? response;
  return (data.dashboard ?? data) as SellerDashboard;
}
