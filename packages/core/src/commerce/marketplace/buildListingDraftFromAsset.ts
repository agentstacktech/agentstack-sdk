import type { BaseAsset } from '../../types';
import type { CreateListingRequest } from '../../types';

export type BuildListingDraftOptions = {
  type?: 'sell' | 'buy' | 'auction' | 'exchange';
  priceUsdt?: string;
  quantity?: number;
  fulfillmentMode?: 'catalog_definition' | 'inventory_backed';
};

function normalizeListingAssetType(
  assetType: string,
): 'currency' | 'digital_item' | 'physical_item' {
  if (
    assetType === 'currency' ||
    assetType === 'digital_item' ||
    assetType === 'physical_item'
  ) {
    return assetType;
  }
  return 'digital_item';
}

export function buildListingDraftFromAsset(
  asset: BaseAsset,
  opts?: BuildListingDraftOptions,
): CreateListingRequest {
  const price =
    opts?.priceUsdt ?? (asset.price_usdt != null ? String(asset.price_usdt) : '0');
  return {
    type: opts?.type ?? 'sell',
    asset: {
      type: normalizeListingAssetType(asset.type || 'digital_item'),
      id: asset.id,
      quantity: opts?.quantity ?? 1,
      price_usdt: price,
      fulfillment_mode: opts?.fulfillmentMode ?? 'catalog_definition',
    },
    whitelist: {
      enabled: false,
      currencies: [],
      assets: [],
    },
    auto_accept: { enabled: false },
  };
}
