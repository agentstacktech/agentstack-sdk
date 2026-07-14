import { getProductBundle } from '../getProductBundle';
import type { HTTPClient } from '../../../client/http-client';

describe('getProductBundle', () => {
  it('skips auth state check for public storefront PDP', async () => {
    let skipAuth = false;
    const client = {
      get: async (_url: string, _params: unknown, options?: { skipAuthStateCheck?: boolean }) => {
        skipAuth = options?.skipAuthStateCheck === true;
        return {
          data: {
            listing: { uuid: 'u1' },
            asset_card: { name: 'Test Item' },
            seller: { project_id: 1, display_name: 'Acme' },
            policy: { rails: ['wallet_internal'], storefront_public: true },
            buyer_context: {},
          },
        };
      },
    } as unknown as HTTPClient;

    await getProductBundle(client, 'u1');
    expect(skipAuth).toBe(true);
  });

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
