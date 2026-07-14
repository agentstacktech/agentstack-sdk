/**
 * AgentNet Testnet Plane — shared DTOs for admin testnet routes.
 * Gene: `core.economy.agentnet.testnet_plane.gen1`
 */

export type TestnetScenarioId =
  | 'grant_demo_full'
  | 'anchor_publish_smoke'
  | 'bridge_intent_smoke'
  | 'vault_deposit_smoke'
  | 'bnb_erc8004_demo'
  | 'arb_identity_mint';

export type ScenarioRunStatus = 'pending' | 'running' | 'succeeded' | 'failed' | 'cancelled';

export type ProofTier = 'l0_batch' | 'l2_anchor' | 'l2_bridge' | 'erc8004';

export interface ChainProfile {
  kind: string;
  chain_id: number;
  caip2?: string;
  enabled: boolean;
  is_testnet?: boolean;
  explorer_base_url?: string | null;
  rpc_configured?: boolean;
  native_currency?: string;
}

export interface RunScenarioBody {
  project_id?: number;
  trace_id?: string;
  dry_run?: boolean;
  skip_anchor?: boolean;
  skip_bridge?: boolean;
  skip_vault?: boolean;
  [key: string]: unknown;
}

export interface ScenarioStepResult {
  step_id: string;
  status: ScenarioRunStatus | string;
  message?: string;
  started_at?: string;
  finished_at?: string;
  proof_tier?: ProofTier;
  [key: string]: unknown;
}

export interface ScenarioRunResult {
  run_id: string;
  scenario_id?: TestnetScenarioId | string;
  status: ScenarioRunStatus | string;
  steps?: ScenarioStepResult[];
  trace_id?: string;
  started_at?: string;
  finished_at?: string;
  error?: string;
  [key: string]: unknown;
}

export interface FaucetMintBody {
  project_id: number;
  user_id: number;
  amount_atomic: number | string;
  idempotency_key?: string;
}

export interface FaucetMintResult {
  ok?: boolean;
  batch_id?: number;
  idempotency_key?: string;
  [key: string]: unknown;
}
