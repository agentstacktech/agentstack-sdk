import type { HTTPClient } from '../../client/http-client';
import type { WalletSummary } from './types';

export async function getParticipantWalletSummary(
  client: HTTPClient,
  projectId?: number,
): Promise<WalletSummary> {
  const response = await client.get('/commerce/participant/wallet-summary', {
    project_id: projectId,
  });
  const data = response.data ?? response;
  return data as WalletSummary;
}
