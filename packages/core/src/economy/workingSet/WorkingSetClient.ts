import type { HTTPClient } from '../../client/http-client';
import { ECONOMY_READ, ECONOMY_WRITE } from '../http/economyHttpOpts';

export class WorkingSetClient {
  constructor(private readonly http: HTTPClient) {}

  async get(
    projectId: number,
    traceId: string,
    flowId: string,
  ): Promise<Record<string, unknown>> {
    const res = await this.http.get<{ draft: Record<string, unknown> }>(
      '/agentnet/working-set',
      {
        params: { project_id: projectId, flow_id: flowId, trace_id: traceId },
        ...ECONOMY_READ,
      },
    );
    return res.data.draft ?? {};
  }

  async put(
    projectId: number,
    traceId: string,
    flowId: string,
    patch: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const res = await this.http.post<{ draft: Record<string, unknown> }>(
      '/agentnet/working-set',
      { patch },
      {
        params: { project_id: projectId, flow_id: flowId, trace_id: traceId },
        ...ECONOMY_WRITE,
      },
    );
    return res.data.draft ?? {};
  }

  async delete(projectId: number, traceId: string, flowId: string): Promise<void> {
    await this.http.delete('/agentnet/working-set', {
      params: { project_id: projectId, flow_id: flowId, trace_id: traceId },
      ...ECONOMY_WRITE,
    });
  }
}
