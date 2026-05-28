import type { HTTPClient } from '../../client/http-client';

export class CartClient {
  constructor(private readonly http: HTTPClient) {}

  async getCart() {
    const response = await this.http.get('/commerce/cart');
    return response.data ?? response;
  }

  async addLine(listingUuid: string, quantity = 1) {
    const response = await this.http.post('/commerce/cart/lines', {
      listing_uuid: listingUuid,
      quantity,
    });
    return response.data ?? response;
  }

  async removeLine(lineId: string) {
    const response = await this.http.delete(`/commerce/cart/lines/${lineId}`);
    return response.data ?? response;
  }

  async mergeGuestLines(lines: { listing_uuid: string; quantity: number }[]) {
    const response = await this.http.post('/commerce/cart/merge', { lines });
    return response.data ?? response;
  }

  async checkout(rail = 'wallet_internal', idempotencyKey?: string) {
    const headers = idempotencyKey
      ? { 'Idempotency-Key': idempotencyKey }
      : undefined;
    const response = await this.http.post(
      '/commerce/cart/checkout',
      {},
      { params: { rail }, headers },
    );
    return response.data ?? response;
  }
}
