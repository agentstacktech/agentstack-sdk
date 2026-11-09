export type CurrencyPackCreateInput = {
  amount: number;
  currency: string;
  recipientProjectId: number;
  currencyCode: string;
  grantAmount: number | string;
  description?: string;
  paymentMethod?: string;
  idempotencyKey?: string;
};

/** POST /payments body for direct soft-currency IAP (no checkout_session_id). */
export function buildCurrencyPackCreateBody(
  input: CurrencyPackCreateInput,
): Record<string, unknown> {
  return {
    amount: input.amount,
    currency: input.currency,
    description: input.description ?? `Buy ${input.currencyCode}`,
    payment_method: input.paymentMethod ?? 'card',
    scope: 'user',
    intent: 'currency_pack',
    recipient_project_id: input.recipientProjectId,
    ...(input.idempotencyKey ? { idempotency_key: input.idempotencyKey } : {}),
    metadata: {
      intent: 'currency_pack',
      recipient_project_id: input.recipientProjectId,
      currency_code: input.currencyCode,
      grant_amount: String(input.grantAmount),
    },
  };
}
