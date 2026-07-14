/**
 * Unified PTR (Proof-of-Task Rails) SDK surface.
 * Genetic tag: core.agentnet.ptr_rails.gen1
 */

import type { HTTPClient } from '../../client/http-client';

export type PtrRailStatus = {
  kind: string;
  chain_id?: number;
  caip2?: string;
  enabled?: boolean;
  ptr_strategy?: string;
  program_id?: string | null;
  cluster?: string | null;
};

export type ProofToTaskBundle = {
  bundle?: Record<string, unknown>;
  bundle_hash?: string;
  bundle_canonical?: string;
};

export async function listPtrRails(http: HTTPClient): Promise<PtrRailStatus[]> {
  const res = await http.get<{ rails?: PtrRailStatus[] }>('/api/agentnet/ptr/rails');
  return res.data.rails ?? [];
}

export async function fetchProofBundle(http: HTTPClient, bundleHash: string): Promise<ProofToTaskBundle> {
  const res = await http.get<ProofToTaskBundle>(`/api/agentnet/proof-bundle/${bundleHash}`);
  return res.data;
}

export type PtrAnchorResult = {
  signature?: string;
  explorer_url?: string;
  bundle_hash?: string;
};

export async function submitPtrValidation(
  http: HTTPClient,
  projectId: number,
  runUuid: string,
  rails: string[] = ['solana_devnet'],
): Promise<PtrAnchorResult> {
  if (rails.includes('solana_devnet')) {
    const res = await http.post<PtrAnchorResult>(
      `/api/projects/${projectId}/agentnet/sol/submit-validation/${runUuid}`,
      {},
    );
    return res.data;
  }
  return {};
}
