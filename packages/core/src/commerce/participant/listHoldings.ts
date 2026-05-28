import type { HTTPClient } from '../../client/http-client';
import type { HoldingRow } from './types';

export async function listParticipantHoldings(
  client: HTTPClient,
  projectId: number,
  opts?: { limit?: number },
): Promise<{ holdings: HoldingRow[]; count: number }> {
  const response = await client.get('/commerce/participant/holdings', {
    project_id: projectId,
    limit: opts?.limit ?? 100,
  });
  const data = response.data ?? response;
  return {
    holdings: (data.holdings ?? []) as HoldingRow[],
    count: data.count ?? 0,
  };
}
