export type FinanceRail =
  | 'payments_usdt'
  | 'vault_agusd'
  | 'native_agnt'
  | 'project_custom'
  | 'project_treasury_fiat';

export interface RailBalanceSlice {
  rail: FinanceRail;
  symbol: string;
  available_atomic: number;
  locked_atomic: number;
  display_decimal: string;
  as_of_iso: string;
  project_id?: number;
  wallet_id?: string;
  storage?: string;
  explorer_url?: string | null;
  reconciliation_ok?: boolean | null;
}

export type { FinanceDashboardBundle, FinanceActivityRow } from './schemas/dashboardBundle';
export type { SwapPair } from './schemas/swapPairs';

export interface FinancePortfolioSnapshot {
  user_id: number;
  ecosystem_project_id: number;
  slices: RailBalanceSlice[];
  total_usd_estimate?: string | null;
}

export interface ProjectFinanceSnapshot {
  project_id: number;
  display_name: string;
  operating_wallets: Record<string, unknown>[];
  treasury_fiat_slices: RailBalanceSlice[];
  treasury_agnt_atomic?: number | null;
  compute_budget?: {
    treasury_agnt_atomic?: number | null;
    builder_energy_current?: number | null;
    builder_energy_purchased?: number | null;
  } | null;
  pending_invoices_count: number;
  pending_withdrawals_count: number;
}

export interface FundProjectRequest {
  projectId: number;
  from_wallet_id: string;
  amount: number;
  currency?: string;
  description?: string;
  idempotencyKey: string;
}

export interface ContributeProjectRequest {
  projectId: number;
  from_wallet_id: string;
  amount: number;
  currency?: string;
  idempotencyKey: string;
  message?: string;
  anonymous?: boolean;
  display_name?: string;
}

export interface ProjectContributionRecord {
  id: string;
  contributor_user_id: number;
  amount_minor: number;
  currency: 'USD';
  from_wallet_id: string;
  to_project_id: number;
  idempotency_key: string;
  message?: string | null;
  anonymous?: boolean;
  display_name?: string | null;
  created_at: string;
  status: 'completed' | 'failed' | 'reversed';
  kind: 'member_contribute' | 'admin_fund';
}
