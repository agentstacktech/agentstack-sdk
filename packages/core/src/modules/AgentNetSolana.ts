/**
 * Solana PTR rail — REST parity for devnet attestation.
 * Genetic tag: core.agentnet.ptr_rails.gen1
 */

import type { HTTPClient } from '../client/http-client';

export type SolanaChainStatus = {
  enabled?: boolean;
  mode?: string;
  cluster?: string;
  program_id?: string;
  rpc_ok?: boolean;
  caip2?: string;
};

export class AgentNetSolana {
  constructor(private readonly http: HTTPClient) {}

  async status(projectId: number): Promise<SolanaChainStatus> {
    const res = await this.http.get<SolanaChainStatus>(`/api/projects/${projectId}/agentnet/sol/status`);
    return res.data;
  }

  async registerIdentity(
    projectId: number,
    body: { agent_uuid: string; name?: string; description?: string },
  ): Promise<{ result: Record<string, unknown> }> {
    const res = await this.http.post<{ result: Record<string, unknown> }>(
      `/api/projects/${projectId}/agentnet/sol/register-identity`,
      body,
    );
    return res.data;
  }

  async proofBundleForRun(projectId: number, runUuid: string): Promise<{ proof: Record<string, unknown> }> {
    const res = await this.http.get<{ proof: Record<string, unknown> }>(
      `/api/projects/${projectId}/agentnet/sol/proof-bundle/${runUuid}`,
    );
    return res.data;
  }

  async submitValidation(
    projectId: number,
    runUuid: string,
  ): Promise<{ signature: string; explorer_url?: string; bundle_hash?: string }> {
    const res = await this.http.post<{ signature: string; explorer_url?: string; bundle_hash?: string }>(
      `/api/projects/${projectId}/agentnet/sol/submit-validation/${runUuid}`,
      {},
    );
    return res.data;
  }

  async submitIntent(
    projectId: number,
    body: {
      agent_uuid: string;
      caip2: string;
      nonce: string;
      payload?: Record<string, unknown>;
      evidence_tier?: 'none' | 'l0_batch' | 'chain_anchor';
    },
  ) {
    const { submitChainIntent } = await import('../economy/agentnet/chainControl');
    return submitChainIntent(this.http, projectId, {
      ...body,
      intent_type: 'fleet.run',
    });
  }
}
