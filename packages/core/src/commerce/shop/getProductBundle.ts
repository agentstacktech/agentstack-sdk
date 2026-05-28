import type { HTTPClient } from '../../client/http-client';

export type ProductBundle = {
  listing: Record<string, unknown>;
  asset_card: {
    id?: string;
    name?: string;
    description?: string;
    thumbnail_url?: string;
    rarity?: string;
    type?: string;
  };
  seller: {
    project_id: number;
    display_name: string;
    reputation?: number | null;
  };
  policy: {
    rails: string[];
    storefront_public: boolean;
  };
  buyer_context: {
    wallet_balance_usdt?: string | null;
    can_express?: boolean;
  };
  visibility?: 'public' | 'limited';
};

export async function getProductBundle(
  client: HTTPClient,
  listingUuid: string,
): Promise<ProductBundle> {
  const response = await client.get(`/commerce/shop/products/${listingUuid}`);
  const data = response.data ?? response;
  return {
    listing: data.listing,
    asset_card: data.asset_card ?? {},
    seller: data.seller,
    policy: {
      rails: data.policy?.rails ?? data.policy?.allowed_rails ?? ['wallet_internal', 'payments_fiat'],
      storefront_public: data.policy?.storefront_public !== false,
    },
    buyer_context: data.buyer_context ?? {},
    visibility: data.visibility,
  };
}
