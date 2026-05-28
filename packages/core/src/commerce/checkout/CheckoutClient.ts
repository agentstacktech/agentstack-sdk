import type { HTTPClient } from '../../client/http-client';

export type CreateCheckoutSessionRequest = {
  listing_uuid: string;
  rail?: string;
  buyer_project_id?: number;
  lines?: Array<{ listing_uuid: string; quantity: number }>;
};

export class CheckoutClient {
  constructor(private readonly http: HTTPClient) {}

  async createSession(
    body: CreateCheckoutSessionRequest,
    idempotencyKey?: string,
  ) {
    const headers = idempotencyKey
      ? { 'Idempotency-Key': idempotencyKey }
      : undefined;
    const response = await this.http.post(
      '/commerce/checkout/sessions',
      body,
      { headers },
    );
    return response.data ?? response;
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
    const response = await this.http.post(
      `/commerce/checkout/sessions/${sessionId}/confirm`,
      {},
      { headers },
    );
    return response.data ?? response;
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
      const status = session?.status;
      if (
        status === 'completed' ||
        status === 'failed' ||
        status === 'expired' ||
        status === 'cancelled'
      ) {
        return result;
      }
      await new Promise((r) => setTimeout(r, interval));
    }
    throw new Error('checkout_poll_timeout');
  }
}
