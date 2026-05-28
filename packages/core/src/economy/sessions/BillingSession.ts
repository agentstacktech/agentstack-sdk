import type { ComputeCreditsClient } from '../clients/ComputeCreditsClient';
import { EconomyError } from '../errors/EconomyError';
import { ComputeCreditQuoteSchema, type ComputeCreditQuote } from '../schemas/computeCreditQuote';

export class BillingSession {
  private quote?: ComputeCreditQuote;

  constructor(
    private readonly projectId: number,
    private readonly credits: ComputeCreditsClient,
    private readonly buyerUserId: number,
  ) {}

  async quoteCredits(creditsAtomic: number): Promise<ComputeCreditQuote> {
    const { quote } = await this.credits.quote(this.projectId, {
      buyer_user_id: this.buyerUserId,
      credits_atomic: creditsAtomic,
    });
    this.quote = ComputeCreditQuoteSchema.parse(quote);
    return this.quote;
  }

  /** Re-quote when client TTL elapsed (server also refreshes expired rows on POST quote). */
  async ensureFreshQuote(creditsAtomic: number): Promise<ComputeCreditQuote> {
    if (!this.quote) {
      return this.quoteCredits(creditsAtomic);
    }
    const expiresAt = Date.parse(this.quote.expires_at);
    if (Number.isFinite(expiresAt) && expiresAt < Date.now()) {
      return this.quoteCredits(creditsAtomic);
    }
    return this.quote;
  }

  async purchase(idempotencyKey: string, opts?: { includeProof?: boolean }) {
    if (!this.quote) {
      throw new EconomyError('QUOTE_REQUIRED', 'Call quoteCredits before purchase');
    }
    const expiresAt = Date.parse(this.quote.expires_at);
    if (Number.isFinite(expiresAt) && expiresAt < Date.now()) {
      throw new EconomyError('QUOTE_EXPIRED', 'Re-quote before purchase');
    }
    return this.credits.purchase(this.projectId, {
      buyer_user_id: this.buyerUserId,
      credits_atomic: this.quote.credits_atomic,
      idempotency_key: idempotencyKey,
      quote_id: this.quote.quote_id,
      quote_hash: this.quote.quote_hash,
      include_proof: opts?.includeProof ?? false,
    });
  }

  getCurrentQuote(): ComputeCreditQuote | undefined {
    return this.quote;
  }
}
