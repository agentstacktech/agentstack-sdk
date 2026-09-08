import { resolveOfferThumb } from './resolveOfferThumb';

/** Parity with storefront index `asset_card` dict + browse normalize. */
export interface StorefrontAssetCard {
  id?: string;
  name?: string;
  description?: string;
  thumbnail_url?: string;
  image_url?: string;
  rarity?: string;
  type?: string;
  price_usdt?: string;
  visual?: {
    thumbnail_url?: string;
    image_url?: string;
  };
  [key: string]: unknown;
}

/** Minimal row shape from `listOffers` / normalize (SPA, hosted, embed). */
export type OfferRowInput = {
  uuid?: string;
  listing_uuid?: string;
  price_usdt?: string;
  title?: string;
  asset_card?: StorefrontAssetCard;
  listing?: { asset?: { name?: string; price_usdt?: string } };
};

export type OfferRowFields = {
  uuid: string;
  title: string;
  description?: string;
  imageUrl?: string;
  priceUsdt: string;
  rarity?: string;
};

/** Single SoT for title, thumb, price string across ProductCard + embed + hosted. */
export function resolveOfferRowFields(row: OfferRowInput): OfferRowFields {
  const card = row.asset_card ?? {};
  const rarity = typeof card.rarity === 'string' ? card.rarity : undefined;
  const description =
    typeof card.description === 'string' ? card.description : undefined;

  return {
    uuid: String(row.uuid ?? row.listing_uuid ?? ''),
    title: String(card.name ?? row.listing?.asset?.name ?? row.title ?? 'Item'),
    description,
    imageUrl: resolveOfferThumb(card),
    priceUsdt: String(
      row.price_usdt ?? card.price_usdt ?? row.listing?.asset?.price_usdt ?? '0',
    ),
    rarity,
  };
}
