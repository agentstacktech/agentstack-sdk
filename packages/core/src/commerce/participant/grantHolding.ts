import type { HTTPClient } from '../../client/http-client';

export async function grantParticipantHolding(
  client: HTTPClient,
  projectId: number,
  body: { user_id: number; asset_id: string; quantity: number; reason?: string },
): Promise<void> {
  await client.post(`/commerce/participant/grant-holding?project_id=${projectId}`, body);
}
