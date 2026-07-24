import type { HTTPClient } from '../../client/http-client';

export class CartClient {
  constructor(private readonly http: HTTPClient) {}

  async getCart() {
    const response = await this.http.get('/commerce/cart');
    return response.data ?? response;
  }

  async addLine(
    listingUuid: string,
    quantity = 1,
    variant?: Record<string, unknown>,
  ) {
    const response = await this.http.post('/commerce/cart/lines', {
      listing_uuid: listingUuid,
      quantity,
      ...(variant && Object.keys(variant).length ? { variant } : {}),
    });
    return response.data ?? response;
  }

  async removeLine(lineId: string) {
    const response = await this.http.delete(`/commerce/cart/lines/${lineId}`);
    return response.data ?? response;
  }

  async setLineQuantity(lineId: string, quantity: number) {
    const response = await this.http.patch(`/commerce/cart/lines/${lineId}`, { quantity });
    return response.data ?? response;
  }

  async mergeGuestLines(
    lines: { listing_uuid: string; quantity: number; variant?: Record<string, string> }[],
    couponCode?: string,
    idempotencyKey?: string,
  ) {
    const headers = idempotencyKey
      ? { 'Idempotency-Key': idempotencyKey }
      : undefined;
    const response = await this.http.post(
      '/commerce/cart/merge',
      {
        lines,
        ...(couponCode?.trim() ? { coupon_code: couponCode.trim() } : {}),
      },
      { headers },
    );
    return response.data ?? response;
  }

  async checkout(
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
    const response = await this.http.post('/commerce/cart/checkout', body, {
      params: { rail },
      headers,
    });
    return response.data ?? response;
  }

  async applyCoupon(coupon: Record<string, unknown> | null, code?: string) {
    const response = await this.http.post('/commerce/cart/apply-coupon', {
      coupon: coupon ?? undefined,
      code: code ?? undefined,
    });
    return response.data ?? response;
  }

  async previewCoupon(
    code: string,
    subtotalMinor: number,
    sellerProjectId?: number,
    listingUuids?: string[],
  ) {
    const response = await this.http.post('/commerce/coupons/preview', {
      code,
      subtotal_minor: subtotalMinor,
      ...(sellerProjectId != null ? { seller_project_id: sellerProjectId } : {}),
      ...(listingUuids?.length ? { listing_uuids: listingUuids } : {}),
    });
    return response.data ?? response;
  }
}
