import type { HTTPClient } from '../../client/http-client';
import { mapCommerceHttpError } from '../errors/mapCommerceHttpError';
import { isRefundPollTerminal } from './refundStateMachine';

export type RefundRequestBody = {
  reason?: string;
  amount_usdt?: string;
  notes?: string;
  project_id?: number;
};

export type RefundRequestResult = {
  order_id: string;
  status: string;
  refund_request_id?: string;
  refund_id?: string;
  message?: string;
  compensation_completed?: boolean;
  compensation_skipped?: boolean;
  reason?: string;
  already_refunded?: boolean;
  already_requested?: boolean;
  refund_request?: Record<string, unknown>;
  compensation?: {
    completed?: boolean;
    method?: string;
    external_refund_id?: string;
  };
};

export type RefundStatusResult = RefundRequestResult;

export type RefundPollOptions = {
  projectId?: number;
  intervalMs?: number;
  timeoutMs?: number;
  isTerminal?: (result: RefundStatusResult) => boolean;
};

function mapRefundHttpError(err: unknown): never {
  const e = err as {
    status?: number;
    response?: { status?: number; data?: Record<string, unknown> };
    data?: Record<string, unknown>;
  };
  const status = Number(e?.status ?? e?.response?.status ?? 0);
  const body = (e?.response?.data ?? e?.data) as
    | { error?: string; detail?: string; error_code?: string }
    | undefined;
  throw mapCommerceHttpError(status || 500, body);
}

export class RefundClient {
  constructor(private readonly http: HTTPClient) {}

  async requestRefund(
    orderId: string,
    body: RefundRequestBody = {},
    idempotencyKey?: string,
  ): Promise<RefundRequestResult> {
    const headers = idempotencyKey
      ? { 'Idempotency-Key': idempotencyKey }
      : undefined;
    try {
      const response = await this.http.post(
        '/commerce/orders/refund-request',
        { order_id: orderId, ...body },
        { headers },
      );
      const data = response.data ?? response;
      return (data.result ?? data) as RefundRequestResult;
    } catch (err) {
      mapRefundHttpError(err);
    }
  }

  async getRefundStatus(orderId: string, projectId?: number): Promise<RefundStatusResult> {
    const response = await this.http.get(
      `/commerce/orders/${encodeURIComponent(orderId)}/refund-request`,
      projectId ? { project_id: projectId } : undefined,
    );
    const data = response.data ?? response;
    return (data.result ?? data) as RefundStatusResult;
  }

  /** Poll GET refund status until terminal (refunded, wallet credited, or fiat manual pending). */
  async pollUntilTerminal(
    orderId: string,
    opts: RefundPollOptions = {},
  ): Promise<RefundStatusResult> {
    const interval = opts.intervalMs ?? 1500;
    const timeout = opts.timeoutMs ?? 60_000;
    const isTerminal = opts.isTerminal ?? isRefundPollTerminal;
    const start = Date.now();
    let last: RefundStatusResult = { order_id: orderId, status: '' };
    while (Date.now() - start < timeout) {
      last = await this.getRefundStatus(orderId, opts.projectId);
      if (isTerminal(last)) {
        return last;
      }
      await new Promise((r) => setTimeout(r, interval));
    }
    throw new Error('refund_poll_timeout');
  }
}
