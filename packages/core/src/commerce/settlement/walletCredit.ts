/** Ledger receipt: provider "completed" is not paid until this is `ok`. */
export const WALLET_CREDIT_OK = 'ok' as const;

export function isWalletCreditOk(credit: unknown): boolean {
  return String(credit ?? '') === WALLET_CREDIT_OK;
}

/** GET /payments body, `{ payment }`, checkout `session`, or nested payment slice. */
/** Checkout session / payment poll — paid only when wallet_credit settled to ok. */
export function isCheckoutSessionPaid(
  payload: Record<string, unknown> | null | undefined,
): boolean {
  return isPaymentWalletCredited(payload);
}

export function isPaymentWalletCredited(
  payload: Record<string, unknown> | null | undefined,
): boolean {
  if (!payload) return false;
  const payment = payload.payment as Record<string, unknown> | undefined;
  const session = payload.session as Record<string, unknown> | undefined;
  const credit =
    payload.wallet_credit ??
    payment?.wallet_credit ??
    session?.wallet_credit;
  return isWalletCreditOk(credit);
}
