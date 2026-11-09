import type { HTTPClient } from '../../client/http-client';

export type SoftCurrencyIapPollRow = {
  wallet_credit?: string;
  soft_currency_grant?: { status?: string } | null;
};

export type PollSoftCurrencyIapOptions = {
  intervalMs?: number;
  timeoutMs?: number;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Poll a payment row until fiat capture and L1 GOO grant are both ok. */
export async function pollSoftCurrencyIap(
  poll: () => Promise<SoftCurrencyIapPollRow>,
  options?: PollSoftCurrencyIapOptions,
): Promise<SoftCurrencyIapPollRow | null> {
  const timeoutMs = options?.timeoutMs ?? 45_000;
  const backoff = [options?.intervalMs ?? 1000, 2000, 5000, 10_000];
  const deadline = Date.now() + timeoutMs;
  let attempt = 0;
  while (Date.now() < deadline) {
    const row = await poll();
    const grant = row.soft_currency_grant;
    if (row.wallet_credit === 'ok' && grant && String(grant.status ?? '') === 'ok') {
      return row;
    }
    const wait = backoff[Math.min(attempt, backoff.length - 1)];
    attempt += 1;
    await sleep(wait);
  }
  return null;
}

/** HTTP helper: poll GET /payments/{id} until IAP complete (wallet + soft_currency_grant). */
export async function pollSoftCurrencyIapPayment(
  http: HTTPClient,
  paymentId: string,
  options?: PollSoftCurrencyIapOptions,
): Promise<Record<string, unknown> | null> {
  let last: Record<string, unknown> | null = null;
  const ok = await pollSoftCurrencyIap(async () => {
    const res = await http.get<Record<string, unknown>>(`/payments/${paymentId}`);
    const payment = (res.data?.payment ?? res.data) as Record<string, unknown>;
    last = payment;
    return {
      wallet_credit: payment?.wallet_credit as string | undefined,
      soft_currency_grant: payment?.soft_currency_grant as { status?: string } | null,
    };
  }, options);
  return ok ? last : null;
}
