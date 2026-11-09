import { bootstrapHostedIapStorefront } from './index';

describe('bootstrapHostedIapStorefront', () => {
  it('calls products before enablement on the wire', async () => {
    const order: string[] = [];
    const fetchFn = jest.fn(async (input: RequestInfo) => {
      const url = String(input);
      if (url.includes('/products?')) order.push('products');
      if (url.includes('/enablement?')) order.push('enablement');
      if (url.includes('/products?')) {
        return {
          ok: true,
          json: async () => ({ products: [{ sku_id: 'pack_1', title: 'Pack' }] }),
        } as Response;
      }
      return {
        ok: true,
        json: async () => ({ sell_enabled: true, catalog_configured: true, blockers: [] }),
      } as Response;
    });
    const out = await bootstrapHostedIapStorefront(2041, { fetchFn: fetchFn as typeof fetch });
    expect(out.products).toHaveLength(1);
    expect(out.enablement.sell_enabled).toBe(true);
    expect(order).toEqual(['products', 'enablement']);
  });
});
