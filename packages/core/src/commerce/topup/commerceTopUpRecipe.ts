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

/** Shared POST /payments body for intent=top_up (DRY with commerceTopUpRecipe). */
export function buildTopUpCreateBody(input: TopUpRecipeInput): Record<string, unknown> {
  return {
    amount: input.amount,
    currency: input.currency ?? 'USD',
    description: input.description ?? 'Commerce wallet top-up',
    intent: 'top_up',
    ...(input.destination_wallet ? { destination_wallet: input.destination_wallet } : {}),
    ...(input.project_id != null ? { recipient_project_id: input.project_id } : {}),
    ...(input.preferred_method ? { preferred_method: input.preferred_method } : {}),
    metadata: {
      ...(input.project_id != null
        ? { recipient_project_id: input.project_id, funding_lane: 'treasury' }
        : { funding_lane: 'personal' }),
    },
  };
}

function normalizePayment(
  raw: Record<string, unknown>,
  fallbackId: string,
): {
  id: string;
  amount: number;
  currency: string;
  status: TopUpPaymentStatus;
  wallet_credit?: string;
} & Record<string, unknown> {
  return {
    id: String(raw.payment_id ?? raw.id ?? fallbackId),
    amount: Number(raw.amount ?? 0),
    currency: String(raw.currency ?? 'USD'),
    status: String(raw.status ?? 'pending') as TopUpPaymentStatus,
    wallet_credit:
      typeof raw.wallet_credit === 'string' ? raw.wallet_credit : undefined,
    ...raw,
  };
}

async function pollPaymentUntilComplete(
  http: HTTPClient,
  paymentId: string,
  opts?: { intervalMs?: number; timeoutMs?: number },
): Promise<Record<string, unknown>> {
  const { pollUntilWalletCredit } = await import('../settlement/pollWalletCredit');
  let last: Record<string, unknown> = {};
  const credited = await pollUntilWalletCredit(
    async () => {
      const response = await http.get(`/payments/${paymentId}`);
      const data = (response.data ?? response) as { payment?: Record<string, unknown> };
      const payment = (data.payment ?? data) as Record<string, unknown>;
      last = payment;
      return {
        wallet_credit: payment.wallet_credit,
        status: String(payment.status ?? ''),
      };
    },
    {
      intervalMs: opts?.intervalMs ?? 2000,
      timeoutMs: opts?.timeoutMs ?? 120_000,
    },
  );
  if (credited) return last;
  const status = String(last.status ?? '');
  if (status === 'failed' || status === 'cancelled' || status === 'refunded') {
    return last;
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

  const createBody = buildTopUpCreateBody(input);

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
  const initialCredited = String(payment.wallet_credit ?? '') === 'ok';
  if (opts?.poll !== false && !(payment.status === 'completed' && initialCredited)) {
    payment = await pollPaymentUntilComplete(http, paymentId, opts);
  }

  const normalized = normalizePayment(payment, paymentId);
  if (
    normalized.status === 'completed' &&
    String(normalized.wallet_credit ?? '') !== 'ok'
  ) {
    normalized.status = 'pending';
  }
  let spendable_balance_usdt: string | undefined;

  if (normalized.status === 'completed' && String(normalized.wallet_credit ?? '') === 'ok') {
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
