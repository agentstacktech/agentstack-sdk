import type { HTTPClient } from '../../client/http-client';
import { mapCommerceHttpError } from '../errors/mapCommerceHttpError';
import { shouldPollCheckout } from './checkoutStateMachine';

export type CreateCheckoutSessionRequest = {
  listing_uuid: string;
  rail?: string;
  buyer_project_id?: number;
  lines?: Array<{ listing_uuid: string; quantity: number }>;
  /** Link paid order to CRM deal (DOCS-G8 / PE crm_lead_to_cash). */
  crm_deal_id?: string;
  crm_project_id?: number;
  metadata?: Record<string, unknown>;
};

function mapCheckoutHttpError(err: unknown): never {
  const e = err as {
    status?: number;
    response?: { status?: number; data?: Record<string, unknown> };
    data?: Record<string, unknown>;
  };
  const status = Number(e?.status ?? e?.response?.status ?? 0);
  const body = (e?.response?.data ?? e?.data) as
    | { error?: string; detail?: string | Record<string, unknown>; error_code?: string }
    | undefined;
  throw mapCommerceHttpError(status || 500, body);
}

export class CheckoutClient {
  constructor(private readonly http: HTTPClient) {}

  async createSession(
    body: CreateCheckoutSessionRequest,
    idempotencyKey?: string,
  ) {
    const headers = idempotencyKey
      ? { 'Idempotency-Key': idempotencyKey }
      : undefined;
    try {
      const response = await this.http.post(
        '/commerce/checkout/sessions',
        body,
        { headers, timeout: 60_000 },
      );
      return response.data ?? response;
    } catch (err) {
      mapCheckoutHttpError(err);
    }
  }

  async getSession(sessionId: string) {
    const response = await this.http.get(
      `/commerce/checkout/sessions/${sessionId}`,
    );
    return response.data ?? response;
  }

  async confirmSession(sessionId: string, idempotencyKey?: string) {
    const headers = idempotencyKey
      ? { 'Idempotency-Key': idempotencyKey }
      : undefined;
    try {
      const response = await this.http.post(
        `/commerce/checkout/sessions/${sessionId}/confirm`,
        {},
        { headers, timeout: 60_000 },
      );
      return response.data ?? response;
    } catch (err) {
      mapCheckoutHttpError(err);
    }
  }

  /** Create checkout from server cart (wallet confirms inline; fiat awaits external pay). */
  async createFromCart(
    rail = 'wallet_internal',
    idempotencyKey?: string,
    opts?: {
      crm_deal_id?: string;
      crm_project_id?: number;
      metadata?: Record<string, unknown>;
    },
  ) {
    const headers = idempotencyKey
      ? { 'Idempotency-Key': idempotencyKey }
      : undefined;
    const body: Record<string, unknown> = {};
    if (opts?.crm_deal_id) body.crm_deal_id = opts.crm_deal_id;
    if (opts?.crm_project_id) body.crm_project_id = opts.crm_project_id;
    if (opts?.metadata) body.metadata = opts.metadata;
    try {
      const response = await this.http.post('/commerce/cart/checkout', body, {
        params: { rail },
        headers,
        timeout: 60_000,
      });
      return response.data ?? response;
    } catch (err) {
      mapCheckoutHttpError(err);
    }
  }

  async pollUntilTerminal(
    sessionId: string,
    opts?: { intervalMs?: number; timeoutMs?: number },
  ) {
    const interval = opts?.intervalMs ?? 1500;
    const timeout = opts?.timeoutMs ?? 60_000;
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const result = await this.getSession(sessionId);
      const session = result.session ?? result;
      const status = String(session?.status ?? '');
      if (
        status === 'completed' ||
        status === 'failed' ||
        status === 'expired' ||
        status === 'cancelled'
      ) {
        return result;
      }
      const uiState =
        status === 'awaiting_payment'
          ? 'awaiting_payment'
          : status === 'confirming'
            ? 'confirming'
            : 'idle';
      if (!shouldPollCheckout(uiState)) {
        return result;
      }
      await new Promise((r) => setTimeout(r, interval));
    }
    throw new Error('checkout_poll_timeout');
  }
}
