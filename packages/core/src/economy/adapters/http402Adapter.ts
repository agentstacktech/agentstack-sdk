/**
 * Optional HTTP 402 hook — does NOT post ledger batches.
 * Maps to balance check / funding offer (R1), not a second SoT.
 *
 * Gene: `sdk.economy.gen1` — post-v1 optional rail
 */

export interface Http402PaymentRequiredBody {
  amount?: string;
  currency?: string;
  payment_url?: string;
  [key: string]: unknown;
}

/** Parse 402 body when present; callers decide funding vs AGNT balance. */
export function parseHttp402Body(body: unknown): Http402PaymentRequiredBody | null {
  if (!body || typeof body !== 'object') {
    return null;
  }
  return body as Http402PaymentRequiredBody;
}
