/**
 * Tenant genome search — REST BFF (parity with MCP genetic.search).
 * Genetic tag: core.genetic.project_genome.gen1
 */

import type { HTTPClient } from '../client/http-client';
import type { ProjectGenomeSearchQuery, ProjectGenomeSearchResult } from './projectGenome';

export async function searchProjectGenome(
  client: HTTPClient,
  query: ProjectGenomeSearchQuery,
): Promise<ProjectGenomeSearchResult> {
  const projectId = Number(query.projectId);
  const res = await client.get<{
    success: boolean;
    data?: ProjectGenomeSearchResult;
    detail?: string;
  }>(`/projects/${projectId}/genetic/search`, {
    params: {
      q: query.query,
      limit: query.limit ?? 16,
    },
    skipCache: true,
  });
  const body = res.data;
  if (!body?.success || !body.data) {
    const detailMsg =
      typeof body === 'object' && body && 'detail' in body
        ? String((body as { detail?: unknown }).detail ?? '')
        : '';
    throw new Error(detailMsg.trim() || `genetic_search_unavailable:${res.status}`);
  }
  return body.data;
}