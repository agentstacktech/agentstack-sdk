import type { HTTPClient } from '../../client/http-client';

export type SoftCurrencyGrantPollOptions = {
  intervalMs?: number;
  timeoutMs?: number;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Poll GET /payments/{id} until soft_currency_grant.status=ok or timeout. */
export async function waitForSoftCurrencyGrant(
  http: HTTPClient,
  paymentId: string,
  options?: SoftCurrencyGrantPollOptions,
): Promise<Record<string, unknown> | null> {
  const intervalMs = options?.intervalMs ?? 1200;
  const timeoutMs = options?.timeoutMs ?? 45_000;
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const res = await http.get<Record<string, unknown>>(`/payments/${paymentId}`);
    const payment = (res.data?.payment ?? res.data) as Record<string, unknown>;
    const grant = payment?.soft_currency_grant as Record<string, unknown> | undefined;
    if (grant && String(grant.status ?? '') === 'ok') {
      return grant;
    }
    await sleep(intervalMs);
  }
  return null;
}
