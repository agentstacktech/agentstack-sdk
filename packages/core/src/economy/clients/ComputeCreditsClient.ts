import type { LedgerClient } from './LedgerClient';

export class ComputeCreditsClient {
  constructor(private readonly ledger: LedgerClient) {}

  quote(
    projectId: number,
    body: { buyer_user_id: number; credits_atomic: number; demo_intent_id?: string },
  ) {
    return this.ledger.quoteComputeCredits(projectId, body);
  }

  purchase(
    projectId: number,
    body: {
      buyer_user_id: number;
      credits_atomic: number;
      idempotency_key: string;
      quote_id: string;
      quote_hash?: string;
      max_agnt_atomic?: number;
      trace_id?: string;
      demo_intent_id?: string;
      include_proof?: boolean;
    },
  ) {
    return this.ledger.purchaseComputeCredits(projectId, body);
  }
}
