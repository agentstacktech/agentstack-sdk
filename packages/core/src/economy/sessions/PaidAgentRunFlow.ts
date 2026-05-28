import type { AgentsFleet } from '../../modules/AgentsFleet';
import { economyIdempotencyKey } from '../utils/idempotency';
import type { BillingSession } from './BillingSession';

export class PaidAgentRunFlow {
  constructor(
    private readonly projectId: number,
    private readonly agents: AgentsFleet,
    private readonly billing: BillingSession,
  ) {}

  async start(params: {
    agentId: string;
    creditsAtomic: number;
    input?: Record<string, unknown>;
    idempotencyKey?: string;
    traceId?: string;
  }): Promise<Record<string, unknown>> {
    const quote = await this.billing.quoteCredits(params.creditsAtomic);
    const idempotencyKey =
      params.idempotencyKey ?? economyIdempotencyKey('paid-run', params.agentId);
    return this.agents.runWithAgntCredits(this.projectId, params.agentId, {
      input: params.input ?? {},
      credits_atomic: params.creditsAtomic,
      idempotency_key: idempotencyKey,
      quote_id: quote.quote_id,
      quote_hash: quote.quote_hash,
      trace_id: params.traceId,
    });
  }
}
