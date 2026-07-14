import React, { useEffect } from 'react';

import { useStorefront } from '../../hooks/useStorefront';
import { BuyButton } from './BuyButton';
import type { ProductGridEmbedProps } from './types';

export function ProductGridEmbed({
  projectId,
  limit = 6,
  params,
  className,
  actions,
  shopListingPath,
  telemetry,
  telemetrySurface = 'product_grid_embed',
}: ProductGridEmbedProps): React.ReactElement {
  const queryParams = {
    scope: projectId ? ('project' as const) : ('global' as const),
    project_id: projectId,
    limit,
    ...params,
  };
  const listingsQ = useStorefront(queryParams);
  const listings =
    (
      listingsQ.data as
        | {
            listings?: Array<{
              uuid: string;
              asset_card?: { name?: string; thumbnail_url?: string };
              listing?: { asset?: { price_usdt?: string } };
            }>;
          }
        | undefined
    )?.listings ?? [];

  useEffect(() => {
    if (!listingsQ.isLoading && !listingsQ.isError) {
      telemetry?.onLoaded?.(telemetrySurface, projectId);
    }
  }, [listingsQ.isLoading, listingsQ.isError, telemetry, telemetrySurface, projectId]);

  if (listingsQ.isLoading) {
    return <p className="text-sm text-slate-500">Loading…</p>;
  }
  if (listingsQ.isError) {
    return <p className="text-sm text-red-600">Could not load products.</p>;
  }
  if (!listings.length) {
    return <p className="text-sm text-slate-500">No listings yet.</p>;
  }

  return (
    <ul
      className={className ?? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'}
      role="list"
    >
      {listings.map((row) => {
        const card = row.asset_card;
        const price = row.listing?.asset?.price_usdt ?? '0';
        return (
          <li
            key={row.uuid}
            className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col"
          >
            <div className="aspect-[4/3] bg-slate-100 dark:bg-slate-800">
              {card?.thumbnail_url ? (
                <img
                  src={card.thumbnail_url}
                  alt=""
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              ) : null}
            </div>
            <div className="p-3 flex flex-col gap-2 flex-1">
              <h3 className="text-sm font-semibold line-clamp-2">{card?.name ?? 'Item'}</h3>
              <p className="text-xs text-slate-600">{price} USDT</p>
              <BuyButton
                listingId={row.uuid}
                label="View"
                actions={actions}
                shopListingPath={shopListingPath}
                telemetry={telemetry}
                telemetrySurface={telemetrySurface}
                className="mt-auto min-h-[44px] w-full rounded-lg border border-slate-300 text-sm"
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
