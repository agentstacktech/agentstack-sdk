import React from 'react';

import type { BuyButtonProps } from './types';

export function BuyButton({
  listingId,
  label = 'Buy',
  className,
  actions,
  shopListingPath,
  telemetry,
  telemetrySurface = 'product_grid_embed',
}: BuyButtonProps): React.ReactElement {
  const onClick = () => {
    telemetry?.onBuyClick?.(listingId, telemetrySurface);
    if (actions?.openCheckout) {
      actions.openCheckout(listingId);
      return;
    }
    if (actions?.openProductQuickView) {
      actions.openProductQuickView(listingId);
      return;
    }
    const href = shopListingPath?.(listingId) ?? `/shop/listing/${encodeURIComponent(listingId)}`;
    if (typeof window !== 'undefined') {
      window.location.assign(`${href}?checkout=1`);
    }
  };

  return (
    <button
      type="button"
      className={
        className ??
        'min-h-[44px] rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white'
      }
      onClick={onClick}
    >
      {label}
    </button>
  );
}
