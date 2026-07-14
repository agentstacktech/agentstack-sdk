/**
 * SDK — 8DNA lineage graph (core.8dna.lineage_graph.gen1)
 */
import type { HTTPClient } from '../client/http-client';

export type LineageDirection = 'ancestors' | 'descendants';

export interface LineageNode {
  uuid: string;
  parent_uuid: string | null;
  generation: number;
  lineage_path?: string[];
}

export interface LineageGraphResponse {
  table: string;
  uuid: string;
  direction: LineageDirection;
  nodes: LineageNode[];
}

export class DnaLineageClient {
  constructor(private readonly http: HTTPClient) {}

  async getAncestors(
    table: string,
    uuid: string,
    projectId: number,
    maxDepth = 50,
  ): Promise<LineageGraphResponse> {
    const response = await this.http.get<LineageGraphResponse>(
      `/dna/lineage/${table}/${uuid}?direction=ancestors&project_id=${projectId}&max_depth=${maxDepth}`,
    );
    return (response as { data?: LineageGraphResponse }).data ?? (response as LineageGraphResponse);
  }

  async getDescendants(
    table: string,
    uuid: string,
    projectId: number,
    maxDepth = 50,
  ): Promise<LineageGraphResponse> {
    const response = await this.http.get<LineageGraphResponse>(
      `/dna/lineage/${table}/${uuid}?direction=descendants&project_id=${projectId}&max_depth=${maxDepth}`,
    );
    return (response as { data?: LineageGraphResponse }).data ?? (response as LineageGraphResponse);
  }
}
