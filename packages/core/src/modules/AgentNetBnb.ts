/**
 * BNB Chain rail — REST parity for BSC testnet (BNBAgent SDK).
 * Genetic tag: core.economy.agentnet.gen1
 */

import type { HTTPClient } from '../client/http-client';

export type BnbChainStatus = {
  enabled?: boolean;
  chain_id?: number;
  rpc_ok?: boolean;
  network?: string;
  identity_registry?: string | null;
};

export class AgentNetBnb {
  constructor(private readonly http: HTTPClient) {}

  async status(projectId: number): Promise<BnbChainStatus> {
    const res = await this.http.get<BnbChainStatus>(`/api/projects/${projectId}/agentnet/bnb/status`);
    return res.data;
  }

  async registerIdentity(
    projectId: number,
    body: { agent_uuid: string; name?: string; description?: string; a2a_url?: string },
  ): Promise<{ result: Record<string, unknown> }> {
    const res = await this.http.post<{ result: Record<string, unknown> }>(
      `/api/projects/${projectId}/agentnet/bnb/register-identity`,
      body,
    );
    return res.data;
  }

  async proofBundleForRun(projectId: number, runUuid: string): Promise<{ proof: Record<string, unknown> }> {
    const res = await this.http.get<{ proof: Record<string, unknown> }>(
      `/api/projects/${projectId}/agentnet/bnb/proof-bundle/${runUuid}`,
    );
    return res.data;
  }

  async apexJobsList(
    projectId: number,
    limit = 50,
  ): Promise<{ jobs: Array<Record<string, unknown>>; total: number }> {
    const res = await this.http.get<{ jobs: Array<Record<string, unknown>>; total: number }>(
      `/api/projects/${projectId}/agentnet/bnb/apex-jobs`,
      { params: { limit } },
    );
    return res.data;
  }
}
