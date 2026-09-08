import type { Money } from '../money/money';
import { moneyFromMajor } from '../money/money';
import type { Listing } from '../../types';
import {
  resolveOfferRowFields,
  type StorefrontAssetCard,
} from './offerRow';

/** Props compatible with `@agentstack/ui/commerce` ProductCard (no React import). */
export interface ProductCardProps {
  title: string;
  description?: string;
  imageUrl?: string;
  price: Money;
  badge?: string;
  href: string;
}

export type { StorefrontAssetCard };

/** Browse row from storefront index + normalize. */
export type StorefrontOfferRow = Listing & {
  asset_card?: StorefrontAssetCard;
  price_usdt?: string;
  facet?: Record<string, unknown>;
  fulfillment_mode?: string;
};

function parsePriceUsdt(priceUsdt: string): Money {
  const n = Number(priceUsdt);
  return moneyFromMajor(Number.isFinite(n) ? n : 0, 'USDT', 2);
}

/**
 * Map a normalized storefront listing row to kit ProductCard props.
 * Caller supplies `href` — mapper does not import routes or React.
 */
export function listingToProductCardProps(
  row: StorefrontOfferRow,
  href: string,
): ProductCardProps {
  const fields = resolveOfferRowFields(row);
  return {
    title: fields.title,
    description: fields.description,
    imageUrl: fields.imageUrl,
    price: parsePriceUsdt(fields.priceUsdt),
    href,
    badge:
      fields.rarity && fields.rarity !== 'common' ? fields.rarity : undefined,
  };
}

/** @internal test helper */
export function listingToProductCardPropsFromParts(
  parts: {
    asset_card?: StorefrontAssetCard;
    price_usdt?: string;
    listing?: { asset?: Partial<Listing['listing']['asset']> & { name?: string; price_usdt?: string } };
  },
  href: string,
): ProductCardProps {
  const fallbackAsset: Listing['listing']['asset'] = {
    type: 'digital_item',
    id: '',
    quantity: 1,
    price_usdt: '0',
  };
  const asset: Listing['listing']['asset'] = {
    ...fallbackAsset,
    ...(parts.listing?.asset ?? {}),
    type: parts.listing?.asset?.type ?? fallbackAsset.type,
    id: parts.listing?.asset?.id ?? fallbackAsset.id,
    quantity: parts.listing?.asset?.quantity ?? fallbackAsset.quantity,
    price_usdt: parts.listing?.asset?.price_usdt ?? fallbackAsset.price_usdt,
  };

  return listingToProductCardProps(
    {
      uuid: 'test',
      project_id: 0,
      user_id: 0,
      listing: {
        type: 'sell',
        status: 'active',
        seller_id: 0,
        seller_project_id: 0,
        whitelist: { enabled: false },
        ...parts.listing,
        asset,
      },
      created_at: '',
      asset_card: parts.asset_card,
      price_usdt: parts.price_usdt,
    },
    href,
  );
}
