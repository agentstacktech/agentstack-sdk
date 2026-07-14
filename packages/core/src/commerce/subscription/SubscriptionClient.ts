import type { HTTPClient } from '../../client/http-client';
import { mapCommerceHttpError } from '../errors/mapCommerceHttpError';

export type SubscriptionPlan = {
  plan_id: string;
  tier?: string;
  name?: string;
  price_usdt?: string;
  billing_period?: string;
  trial_days?: number;
  asset_id?: string;
  listing_uuid?: string;
};

export type BuyerSubscription = {
  subscription_id: string;
  plan_id?: string;
  asset_id?: string;
  listing_uuid?: string;
  status: string;
  auto_renew?: boolean;
  current_period_start?: string;
  current_period_end?: string;
  expires_at?: string;
};

export type PurchaseSubscriptionRequest = {
  listing_uuid?: string;
  plan_id?: string;
  asset_id?: string;
  rail?: string;
  auto_renew?: boolean;
  buyer_project_id?: number;
};

function mapSubscriptionHttpError(err: unknown): never {
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

export class SubscriptionClient {
  constructor(private readonly http: HTTPClient) {}

  async listPlans(projectId?: number): Promise<{ plans: SubscriptionPlan[] }> {
    const response = await this.http.get('/commerce/subscriptions/plans', {
      project_id: projectId,
    });
    const data = response.data ?? response;
    return { plans: (data.plans ?? []) as SubscriptionPlan[] };
  }

  async listMySubscriptions(opts?: {
    projectId?: number;
  }): Promise<{ subscriptions: BuyerSubscription[] }> {
    const response = await this.http.get('/commerce/subscriptions', {
      project_id: opts?.projectId,
    });
    const data = response.data ?? response;
    return {
      subscriptions: (data.subscriptions ?? []) as BuyerSubscription[],
    };
  }

  async purchase(
    body: PurchaseSubscriptionRequest,
    idempotencyKey?: string,
  ): Promise<Record<string, unknown>> {
    const headers = idempotencyKey
      ? { 'Idempotency-Key': idempotencyKey }
      : undefined;
    try {
      const response = await this.http.post(
        '/commerce/subscriptions/purchase',
        body,
        { headers },
      );
      return (response.data ?? response) as Record<string, unknown>;
    } catch (err) {
      mapSubscriptionHttpError(err);
    }
  }

  async cancel(subscriptionId: string): Promise<Record<string, unknown>> {
    const response = await this.http.post(
      `/commerce/subscriptions/${subscriptionId}/cancel`,
      {},
    );
    return (response.data ?? response) as Record<string, unknown>;
  }

  async renew(subscriptionId: string, idempotencyKey?: string): Promise<Record<string, unknown>> {
    const headers = idempotencyKey
      ? { 'Idempotency-Key': idempotencyKey }
      : undefined;
    try {
      const response = await this.http.post(
        `/commerce/subscriptions/${subscriptionId}/renew`,
        {},
        { headers },
      );
      return (response.data ?? response) as Record<string, unknown>;
    } catch (err) {
      mapSubscriptionHttpError(err);
    }
  }
}
