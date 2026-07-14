/**
 * One-call grant demo for reviewers — public snapshot + optional canonical batch proof.
 * Gene: `core.economy.agentnet.testnet_plane.gen1`
 */

import type { AgentStackSDK } from '../../sdk';
import type { PublicGrantsSnapshot } from '../../public/grants';
import type { AgentCoinBatchProofPayload } from '../clients/ledgerTypes';

export interface TestnetGrantDemoRecipeParams {
  /** When set, fetch allowlisted Merkle proof for this batch (defaults to snapshot canonical). */
  batchId?: number;
  signal?: AbortSignal;
}

export interface TestnetGrantDemoRecipeResult {
  snapshot: PublicGrantsSnapshot;
  proof?: AgentCoinBatchProofPayload;
  batchId?: number;
}

/**
 * Read-only grant demo: evidence snapshot + optional L0 batch proof (public BFF).
 * No admin JWT; suitable for `/grants/demo` integrators.
 */
export async function testnetGrantDemoRecipe(
  sdk: AgentStackSDK,
  params: TestnetGrantDemoRecipeParams = {},
): Promise<TestnetGrantDemoRecipeResult> {
  const snapshot = await sdk.public.grants.getEvidenceSnapshot({ signal: params.signal });
  const batchId =
    params.batchId ??
    (typeof snapshot.canonical_batch_id === 'number' ? snapshot.canonical_batch_id : undefined);

  if (batchId == null) {
    return { snapshot };
  }

  const proof = await sdk.public.grants.getBatchProof(batchId, { signal: params.signal });
  return { snapshot, proof, batchId };
}
