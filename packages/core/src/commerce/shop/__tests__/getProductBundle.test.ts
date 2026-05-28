import { describe, expect, it } from 'vitest';
import { getProductBundle } from '../getProductBundle';
import type { HTTPClient } from '../../../client/http-client';

describe('getProductBundle', () => {
  it('normalizes BFF response', async () => {
    const client = {
      get: async () => ({
        data: {
          listing: { uuid: 'u1' },
          asset_card: { name: 'Test Item' },
          seller: { project_id: 1, display_name: 'Acme' },
          policy: { rails: ['wallet_internal'], storefront_public: true },
          buyer_context: { can_express: true },
        },
      }),
    } as unknown as HTTPClient;

    const bundle = await getProductBundle(client, 'u1');
    expect(bundle.asset_card.name).toBe('Test Item');
    expect(bundle.seller.display_name).toBe('Acme');
    expect(bundle.policy.storefront_public).toBe(true);
  });
});
