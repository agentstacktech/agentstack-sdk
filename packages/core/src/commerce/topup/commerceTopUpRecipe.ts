import type { HTTPClient } from '../../client/http-client';
import { getParticipantWalletSummary } from '../participant/getWalletSummary';

export type TopUpRecipeInput = {
  amount: number;
  currency?: string;
  destination_wallet?: string;
  project_id?: number;
  preferred_method?: string;
  description?: string;
};

export type TopUpPaymentStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'refunded';

export type TopUpRecipeResult = {
  payment_id: string;
  status: TopUpPaymentStatus;
  spendable_balance_usdt?: string;
  payment: Record<string, unknown>;
};

export type TopUpRecipeOptions = {
  poll?: boolean;
  intervalMs?: number;
  timeoutMs?: number;
  idempotencyKey?: string;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizePayment(raw: Record<string, unknown>, fallbackId: string) {
  return {
    id: String(raw.payment_id ?? raw.id ?? fallbackId),
    amount: Number(raw.amount ?? 0),
    currency: String(raw.currency ?? 'USD'),
    status: String(raw.status ?? 'pending') as TopUpPaymentStatus,
    ...raw,
  };
}

async function pollPaymentUntilComplete(
  http: HTTPClient,
  paymentId: string,
  opts?: { intervalMs?: number; timeoutMs?: number },
): Promise<Record<string, unknown>> {
  const interval = opts?.intervalMs ?? 2000;
  const timeout = opts?.timeoutMs ?? 120_000;
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const response = await http.get(`/payments/${paymentId}`);
    const data = (response.data ?? response) as {
      payment?: Record<string, unknown>;
    };
    const payment = (data.payment ?? data) as Record<string, unknown>;
    const status = String(payment.status ?? '');
    if (
      status === 'completed' ||
      status === 'failed' ||
      status === 'cancelled' ||
      status === 'refunded'
    ) {
      return payment;
    }
    await sleep(interval);
  }
  throw new Error('top_up_poll_timeout');
}

/**
 * Commerce top-up recipe — POST /payments intent=top_up, optional poll, return spendable balance.
 */
export async function commerceTopUpRecipe(
  http: HTTPClient,
  input: TopUpRecipeInput,
  opts?: TopUpRecipeOptions,
): Promise<TopUpRecipeResult> {
  const headers = opts?.idempotencyKey
    ? { 'Idempotency-Key': opts.idempotencyKey }
    : undefined;

  const createBody = {
    amount: input.amount,
    currency: input.currency ?? 'USD',
    description: input.description ?? 'Commerce wallet top-up',
    intent: 'top_up',
    ...(input.destination_wallet ? { destination_wallet: input.destination_wallet } : {}),
    ...(input.project_id != null ? { recipient_project_id: input.project_id } : {}),
    ...(input.preferred_method ? { preferred_method: input.preferred_method } : {}),
  };

  const createRes = await http.post('/payments', createBody, { headers });
  const createData = (createRes.data ?? createRes) as {
    payment?: Record<string, unknown>;
    payment_id?: string;
  };
  const initial = (createData.payment ?? createData) as Record<string, unknown>;
  const paymentId = String(initial.payment_id ?? initial.id ?? '');
  if (!paymentId) {
    throw new Error('top_up_missing_payment_id');
  }

  let payment = initial;
  if (opts?.poll !== false && payment.status !== 'completed') {
    payment = await pollPaymentUntilComplete(http, paymentId, opts);
  }

  const normalized = normalizePayment(payment, paymentId);
  let spendable_balance_usdt: string | undefined;

  if (normalized.status === 'completed') {
    try {
      const summary = await getParticipantWalletSummary(http, input.project_id);
      const usdtHolding = summary.holdings?.find(
        (h) => String(h.asset_id).toUpperCase() === 'USDT',
      );
      if (usdtHolding) {
        spendable_balance_usdt = String(usdtHolding.available ?? usdtHolding.quantity ?? 0);
      }
    } catch {
      /* wallet summary is best-effort after top-up */
    }
  }

  return {
    payment_id: paymentId,
    status: normalized.status as TopUpPaymentStatus,
    spendable_balance_usdt,
    payment: normalized,
  };
}
