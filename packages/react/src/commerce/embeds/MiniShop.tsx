import React from 'react';

import { ProductGridEmbed } from './ProductGridEmbed';
import type { MiniShopProps } from './types';

export function MiniShop({
  projectId,
  limit = 4,
  title = 'Shop',
  className,
  actions,
  shopHref,
  shopListingPath,
  telemetry,
  telemetrySurface = 'mini_shop',
}: MiniShopProps): React.ReactElement {
  const browseHref = shopHref ?? `/shop/p/${projectId}`;

  return (
    <section className={className ?? 'space-y-3 rounded-xl border border-slate-200 dark:border-slate-700 p-4'}>
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">{title}</h3>
        <a href={browseHref} className="text-xs font-medium text-blue-600 hover:underline">
          View all
        </a>
      </div>
      <ProductGridEmbed
        projectId={projectId}
        limit={limit}
        actions={actions}
        shopListingPath={shopListingPath}
        telemetry={telemetry}
        telemetrySurface={telemetrySurface}
        className="grid grid-cols-1 sm:grid-cols-2 gap-3"
      />
    </section>
  );
}
