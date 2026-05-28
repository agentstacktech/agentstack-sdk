import type { HTTPClient } from '../../client/http-client';
import type { GuidanceChecklistStep } from './types';

export async function getCommerceChecklist(
  client: HTTPClient,
  projectId: number,
): Promise<{ steps: GuidanceChecklistStep[]; health_score: number }> {
  const response = await client.get('/commerce/guidance/checklist', {
    project_id: projectId,
  });
  const data = response.data ?? response;
  return {
    steps: (data.steps ?? []) as GuidanceChecklistStep[],
    health_score: data.health_score ?? 0,
  };
}
