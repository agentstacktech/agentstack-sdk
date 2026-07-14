/**
 * Public grant reviewer BFF types (read-only, no JWT).
 * Gene: `frontend.public.grants_reviewer.gen1`
 */

import type { AgentcoinChainSurfacePayload } from '../../modules/AgentAdmin';
import type { AgentCoinBatchProofPayload } from '../../economy/clients/ledgerTypes';
import type { ProofTier } from '../../economy/clients/testnetTypes';

export interface PublicGrantsBlocker {
  id: string;
  message?: string;
  severity?: string;
}

export interface PublicGrantsGrsSlice {
  score?: number;
  submit_ready?: boolean;
  blockers?: PublicGrantsBlocker[];
}

export interface PublicGrantsProofTiers {
  l0_batch?: boolean;
  l2_anchor?: boolean;
  l2_bridge?: boolean;
  erc8004_bsc?: boolean;
  erc8004_arb?: boolean;
  [key: string]: boolean | undefined;
}

export interface PublicContractLink {
  label: string;
  address_masked?: string;
  explorer_url?: string | null;
  chain_id?: number;
}

export interface PublicGrantsSnapshot {
  grs?: PublicGrantsGrsSlice;
  proof_tiers?: PublicGrantsProofTiers;
  canonical_batch_id?: number | null;
  contract_links?: PublicContractLink[];
  rails?: Record<string, unknown>;
  proof_tier_labels?: Partial<Record<ProofTier, string>>;
  updated_at?: string;
  available?: boolean;
  [key: string]: unknown;
}

export type PublicChainSurfacePayload = AgentcoinChainSurfacePayload;
export type PublicBatchProofPayload = AgentCoinBatchProofPayload;
