import type { HTTPClient } from '../../client/http-client';

export class OrdersClient {
  constructor(private readonly http: HTTPClient) {}

  async listOrders(limit = 50) {
    const response = await this.http.get('/commerce/orders', { limit });
    return response.data ?? response;
  }

  async getOrder(orderId: string) {
    const response = await this.http.get(`/commerce/orders/${orderId}`);
    return response.data ?? response;
  }
}
