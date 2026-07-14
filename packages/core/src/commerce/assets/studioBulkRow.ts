import type { AssetDraft } from './schemas';

/** Bulk-grid row for Storefront Studio seed plans (`sdk.commerce.assets.gen1`). */
export type StudioBulkProductRow = {
  row_id: string;
  preset_id: string;
  name: string;
  sku: string;
  price_usdt: string;
  compare_at_usdt?: string;
  description: string;
  image_url: string;
  create_listing: boolean;
  featured: boolean;
  quantity?: number;
  fulfillment_mode?: string;
  group_id?: string;
  variant?: Record<string, string>;
};

let rowCounter = 0;

export function newStudioBulkRow(partial?: Partial<StudioBulkProductRow>): StudioBulkProductRow {
  rowCounter += 1;
  return {
    row_id: partial?.row_id ?? `row-${rowCounter}`,
    preset_id: partial?.preset_id ?? 'marketplace_product',
    name: partial?.name ?? '',
    sku: partial?.sku ?? '',
    price_usdt: partial?.price_usdt ?? '9.99',
    description: partial?.description ?? '',
    image_url: partial?.image_url ?? '',
    create_listing: partial?.create_listing ?? true,
    featured: partial?.featured ?? false,
    compare_at_usdt: partial?.compare_at_usdt,
    quantity: partial?.quantity ?? 1,
    fulfillment_mode: partial?.fulfillment_mode ?? 'catalog_definition',
    group_id: partial?.group_id,
    variant: partial?.variant,
  };
}

/** Map wizard / expert `AssetDraft` → studio bulk row for seed reuse. */
export function assetDraftToStudioBulkRow(
  draft: AssetDraft,
  options?: { presetId?: string; rowId?: string; featured?: boolean },
): StudioBulkProductRow {
  const props = draft.components?.properties;
  const visual = draft.components?.visual;
  const presetFromMeta = draft.components?.metadata?.created_by_preset;
  const presetId =
    options?.presetId ??
    (typeof presetFromMeta === 'string' && presetFromMeta ? presetFromMeta : 'marketplace_product');

  return newStudioBulkRow({
    row_id: options?.rowId ?? draft.id,
    preset_id: presetId,
    name: draft.name,
    price_usdt: draft.price_usdt,
    description: typeof props?.description === 'string' ? props.description : '',
    image_url:
      (typeof visual?.image_url === 'string' && visual.image_url) ||
      (typeof visual?.icon_url === 'string' && visual.icon_url) ||
      '',
    sku: typeof draft.id === 'string' ? draft.id : '',
    create_listing: true,
    featured: options?.featured ?? false,
  });
}
