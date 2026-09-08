export type PaymentSourceKind =
  | 'personal_wallet'
  | 'project_operating'
  | 'project_treasury'
  | 'agnt_ledger'
  | 'builder_energy_pool'
  | 'external_card';

export type PayIntentKind =
  | 'top_up'
  | 'subscription'
  | 'energy_pack'
  | 'agent_run'
  | 'compute_credits'
  | 'commerce_checkout'
  | 'project_fund'
  | 'project_contribute'
  | 'invoice_pay';

export interface PaymentSourceRef {
  kind: PaymentSourceKind;
  project_id: number;
  wallet_id?: string | null;
  currency?: string;
}

export interface PayQuoteRequest {
  intent: PayIntentKind;
  source: PaymentSourceRef;
  amount: number;
  currency?: string;
  metadata?: Record<string, unknown>;
}

export interface PayQuoteResponse {
  quote_id: string;
  quote_hash: string;
  intent: string;
  amount: string;
  currency: string;
  expires_at?: string;
  source?: PaymentSourceRef;
  metadata?: Record<string, unknown>;
}

export interface PayExecuteRequest {
  quote_id: string;
  quote_hash: string;
  idempotency_key: string;
}

export interface PayExecuteResponse {
  success: boolean;
  intent?: string;
  source?: PaymentSourceRef;
  amount?: string;
  currency?: string;
  transaction_id?: string;
  energy_grant?: Record<string, unknown>;
  subscription?: Record<string, unknown>;
  purchase?: Record<string, unknown>;
}
