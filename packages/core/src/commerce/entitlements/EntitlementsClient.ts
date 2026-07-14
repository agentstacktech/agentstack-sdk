import type { HTTPClient } from '../../client/http-client';

export type EntitlementKind =
  | 'download'
  | 'access'
  | 'subscription'
  | 'service_ticket';

export type EntitlementStatus = 'active' | 'expired' | 'revoked';

export type EntitlementRow = {
  entitlement_id: string;
  asset_id: string;
  kind: EntitlementKind | string;
  scope?: Record<string, unknown>;
  granted_at?: string;
  expires_at?: string | null;
  status: EntitlementStatus | string;
  order_id?: string;
  listing_uuid?: string;
  capability?: string;
  delivery_url?: string;
  title?: string;
};

export type MyPurchaseRow = {
  order_id: string;
  listing_uuid?: string;
  asset_id?: string;
  title?: string;
  status?: string;
  fulfillment_status?: string;
  delivery_url?: string;
  delivery_expires_at?: string | null;
  entitlements?: EntitlementRow[];
  completed_at?: string;
  total_usdt?: string;
};

export class EntitlementsClient {
  constructor(private readonly http: HTTPClient) {}

  async listEntitlements(opts?: {
    projectId?: number;
    status?: EntitlementStatus | string;
    limit?: number;
  }): Promise<{ entitlements: EntitlementRow[]; total: number }> {
    const response = await this.http.get('/commerce/entitlements', {
      project_id: opts?.projectId,
      status: opts?.status,
      limit: opts?.limit ?? 50,
    });
    const data = response.data ?? response;
    return {
      entitlements: (data.entitlements ?? []) as EntitlementRow[],
      total: Number(data.total ?? data.entitlements?.length ?? 0),
    };
  }

  async getEntitlement(entitlementId: string): Promise<EntitlementRow> {
    const response = await this.http.get(`/commerce/entitlements/${entitlementId}`);
    const data = response.data ?? response;
    return (data.entitlement ?? data) as EntitlementRow;
  }

  async listMyPurchases(opts?: {
    projectId?: number;
    limit?: number;
  }): Promise<{ purchases: MyPurchaseRow[]; total: number }> {
    const response = await this.http.get('/commerce/my-purchases', {
      project_id: opts?.projectId,
      limit: opts?.limit ?? 50,
    });
    const data = response.data ?? response;
    return {
      purchases: (data.purchases ?? data.orders ?? []) as MyPurchaseRow[],
      total: Number(data.total ?? data.purchases?.length ?? 0),
    };
  }

  async refreshDeliveryLink(opts: {
    orderId: string;
    listingUuid?: string;
    projectId?: number;
  }): Promise<{
    success: boolean;
    delivery_url?: string;
    delivery_expires_at?: string | null;
    entitlement_id?: string;
  }> {
    const response = await this.http.post(
      '/commerce/delivery/refresh',
      {
        order_id: opts.orderId,
        listing_uuid: opts.listingUuid,
      },
      { params: opts.projectId ? { project_id: opts.projectId } : undefined },
    );
    const data = response.data ?? response;
    return data as {
      success: boolean;
      delivery_url?: string;
      delivery_expires_at?: string | null;
      entitlement_id?: string;
    };
  }
}
