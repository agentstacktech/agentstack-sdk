/**
 * Chain Control Mesh SDK surface.
 * Genetic tag: core.economy.agentnet.chain_control.gen1
 */

import type { HTTPClient } from '../../client/http-client';

export type ChainRailStatus = {
  kind: string;
  caip2?: string;
  enabled?: boolean;
  control_strategy?: string;
  control_program_id?: string | null;
};

export type ChainIntentRecord = {
  intent_id: string;
  status: string;
  run_uuid?: string | null;
  envelope?: Record<string, unknown>;
  error?: string | null;
};

export type DelegationCaps = {
  allowed_mcp_domains?: string[];
  allowed_actions?: string[];
  max_spend_atomic_per_day?: number | null;
  evidence_tier_default?: 'none' | 'l0_batch' | 'chain_anchor';
};

export async function listChainRails(http: HTTPClient): Promise<ChainRailStatus[]> {
  const res = await http.get<{ rails?: ChainRailStatus[] }>('/api/agentnet/chain/rails');
  return res.data.rails ?? [];
}

export async function submitChainIntent(
  http: HTTPClient,
  projectId: number,
  body: {
    agent_uuid: string;
    intent_type?: 'fleet.run' | 'mcp.tool' | 'logic.flow';
    payload?: Record<string, unknown>;
    caip2: string;
    nonce: string;
    deadline_unix?: number;
    signer_caip10?: string;
    evidence_tier?: 'none' | 'l0_batch' | 'chain_anchor';
  },
): Promise<ChainIntentRecord> {
  const res = await http.post<ChainIntentRecord>(
    `/api/projects/${projectId}/agentnet/chain/intents`,
    body,
  );
  return res.data;
}

export async function getChainIntent(
  http: HTTPClient,
  projectId: number,
  intentId: string,
): Promise<ChainIntentRecord> {
  const res = await http.get<ChainIntentRecord>(
    `/api/projects/${projectId}/agentnet/chain/intents/${intentId}`,
  );
  return res.data;
}

export async function getDelegation(
  http: HTTPClient,
  projectId: number,
  agentUuid: string,
): Promise<{ delegation_caps?: DelegationCaps; chain_control_rails?: string[] }> {
  const res = await http.get<{ delegation_caps?: DelegationCaps; chain_control_rails?: string[] }>(
    `/api/projects/${projectId}/agentnet/chain/delegations/${agentUuid}`,
  );
  return res.data;
}

export async function syncDelegation(
  http: HTTPClient,
  projectId: number,
  agentUuid: string,
  delegation_caps: DelegationCaps,
): Promise<{ ok: boolean }> {
  const res = await http.post<{ ok: boolean }>(
    `/api/projects/${projectId}/agentnet/chain/delegations/${agentUuid}`,
    { delegation_caps },
  );
  return res.data;
}
