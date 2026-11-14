/**
 * Tenant genome snapshot — REST BFF (same wire as SPA).
 * Genetic tag: core.genetic.project_genome.gen1
 */

import type { HTTPClient } from '../client/http-client';
import type { ProjectGenomeQuery, ProjectGenomeSnapshot } from './projectGenome';

export async function getProjectGenomeSnapshot(
  client: HTTPClient,
  query: ProjectGenomeQuery,
): Promise<ProjectGenomeSnapshot> {
  const projectId = Number(query.projectId);
  const detail = query.detail ?? 'compact';
  const res = await client.get<{ success: boolean; data?: ProjectGenomeSnapshot }>(
    `/projects/${projectId}/genetic/snapshot`,
    {
      params: {
        detail,
        limit: query.limit,
        cursor: query.cursor,
      },
    },
  );
  const body = res.data;
  if (!body?.success || !body.data) {
    throw new Error('genetic_snapshot_unavailable');
  }
  return body.data;
}