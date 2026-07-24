/** Chromeless money surfaces — sdk.commerce.surfaces.gen1 */

import type { HTTPClient } from '../../client/http-client';

export type CommerceSurfaceKind = 'checkout' | 'pay' | 'topup' | 'receipt';

export type CreateSurfaceSessionInput = {
  surface?: CommerceSurfaceKind;
  listing_uuids?: string[];
  return_url?: string;
  cancel_url?: string;
  theme?: 'light' | 'dark' | 'auto';
  locale?: string;
  amount_minor?: number;
  currency?: string;
  project_id?: number;
  commerce_checkout_id?: string;
  payment_id?: string;
  expires_in_seconds?: number;
};

export type CreateIntentInput = {
  kind?: CommerceSurfaceKind;
  listing_uuids?: string[];
  return_url?: string;
  cancel_url?: string;
  source?: string;
  project_id?: number;
  amount_minor?: number;
  currency?: string;
  locale?: string;
  theme?: 'light' | 'dark' | 'auto';
  expires_in_seconds?: number;
};

/**
 * Stable Idempotency-Key for retries (G6).
 * Reuse until terminal success/fail; do not mint a new UUID per click.
 */
export function stableCommerceIdempotencyKey(parts: Array<string | number | null | undefined>): string {
  const raw = parts
    .map((p) => (p == null ? '' : String(p)))
    .join('|')
    .slice(0, 200);
  let h = 2166136261;
  for (let i = 0; i < raw.length; i += 1) {
    h ^= raw.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `cik_${(h >>> 0).toString(16)}_${raw.length}`;
}

export class CommerceSurfaceClient {
  constructor(private readonly http: HTTPClient) {}

  async create(input: CreateSurfaceSessionInput, idempotencyKey?: string) {
    const headers = idempotencyKey
      ? { 'Idempotency-Key': idempotencyKey }
      : undefined;
    const response = await this.http.post(
      '/commerce/surfaces/sessions',
      { surface: 'checkout', ...input },
      { headers },
    );
    return response.data ?? response;
  }

  async get(
    sessionId: string,
    auth: { token: string; exp?: number; sig?: string },
  ) {
    const response = await this.http.get(
      `/commerce/surfaces/sessions/${sessionId}`,
      { params: auth },
    );
    return response.data ?? response;
  }
}

export class CommerceIntentClient {
  constructor(private readonly http: HTTPClient) {}

  async create(input: CreateIntentInput) {
    const response = await this.http.post('/commerce/intents', {
      kind: 'checkout',
      ...input,
    });
    return response.data ?? response;
  }

  async verify(query: {
    p: string;
    token: string;
    exp: number;
    sig?: string;
  }) {
    const response = await this.http.get('/commerce/intents/verify', {
      params: query,
    });
    return response.data ?? response;
  }
}
