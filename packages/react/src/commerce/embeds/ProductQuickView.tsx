import React from 'react';

import { useProductDetail } from '../../hooks/useProductDetail';
import { BuyButton } from './BuyButton';
import type { ProductQuickViewProps } from './types';

/** Inline quick-view panel (host may also open via ModalSDK through `actions`). */
export function ProductQuickView({
  listingId,
  open = true,
  onClose,
  actions,
  shopListingPath,
}: ProductQuickViewProps): React.ReactElement | null {
  const bundleQ = useProductDetail(open ? listingId : undefined);

  if (!open) return null;

  if (bundleQ.isLoading) {
    return <p className="text-sm p-4">Loading…</p>;
  }
  if (bundleQ.isError || !bundleQ.data) {
    return <p className="text-sm text-red-600 p-4">Product not found</p>;
  }

  const bundle = bundleQ.data;
  const price =
    (bundle.listing as { listing?: { asset?: { price_usdt?: string } } }).listing?.asset
      ?.price_usdt ?? '0';

  return (
    <div className="space-y-4 p-4 max-w-md">
      {bundle.asset_card.thumbnail_url ? (
        <img
          src={bundle.asset_card.thumbnail_url}
          alt=""
          className="w-full rounded-lg aspect-square object-cover"
        />
      ) : null}
      <h2 className="text-lg font-semibold">{bundle.asset_card.name}</h2>
      <p className="text-sm">{price} USDT</p>
      <div className="flex gap-2">
        <BuyButton listingId={listingId} actions={actions} shopListingPath={shopListingPath} />
        {onClose ? (
          <button type="button" className="min-h-[44px] px-4 text-sm" onClick={onClose}>
            Close
          </button>
        ) : null}
      </div>
    </div>
  );
}
