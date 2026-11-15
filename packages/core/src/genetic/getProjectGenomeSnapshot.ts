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
  const res = await client.get<{ success: boolean; data?: ProjectGenomeSnapshot; detail?: string }>(
    `/projects/${projectId}/genetic/snapshot`,
    {
      params: {
        detail,
        limit: query.limit,
        cursor: query.cursor,
      },
      skipCache: true,
    },
  );
  const body = res.data;
  if (!body?.success || !body.data) {
    const detailMsg =
      typeof body === 'object' && body && 'detail' in body
        ? String((body as { detail?: unknown }).detail ?? '')
        : '';
    throw new Error(
      detailMsg.trim() || `genetic_snapshot_unavailable:${res.status}`,
    );
  }
  return body.data;
}