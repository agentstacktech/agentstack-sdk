/** Shared ledger types for LedgerClient / economy facade. */

export interface AgentCoinLedgerLine {
  account_key: string;
  asset_code?: string;
  side: 'D' | 'C' | 'DEBIT' | 'CREDIT';
  amount_atomic: number;
}

export interface AgentCoinPostBatchBody {
  idempotency_key: string;
  lines: AgentCoinLedgerLine[];
  metadata?: Record<string, unknown>;
}

export interface AgentCoinBalancePayload {
  balance_atomic: number;
  asset_code: string;
  account_key: string;
  project_id: number;
  ledger_seq?: number;
}

export interface AgentCoinProofStep {
  sibling: string;
  position: 'left' | 'right';
}

export interface AgentCoinBatchProofEntry {
  sort_index: number;
  leaf_hash: string;
  account_key: string;
  side: string;
  amount_atomic: number;
}

export interface AgentCoinBatchProofLeg {
  sort_index: number;
  leaf: string;
  path: AgentCoinProofStep[];
}

export interface AgentCoinBatchProofPayload {
  project_id: number;
  batch_id: number;
  chain_hash: string;
  merkle_root: string;
  payload_hash?: string | null;
  created_at?: string | null;
  checkpoint?: Record<string, unknown> | null;
  entries: AgentCoinBatchProofEntry[];
  proofs: AgentCoinBatchProofLeg[];
}
