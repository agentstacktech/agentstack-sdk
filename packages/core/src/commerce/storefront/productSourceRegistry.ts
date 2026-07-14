import type { StorefrontSeedProductSpec } from './StorefrontSeedClient';

export type ProductSourceKind =
  | 'preset'
  | 'csv'
  | 'json'
  | 'clone'
  | 'ai_batch'
  | 'magic';

export type ProductSourcePayload = Record<string, unknown>;

/** OCP port — all strategies return `StorefrontSeedProductSpec[]` (`core.commerce.bulk_ingest.gen1`). */
export interface IProductSource {
  readonly kind: ProductSourceKind;
  parse(
    payload: ProductSourcePayload,
    defaults?: { presetId?: string },
  ): StorefrontSeedProductSpec[];
}

function normalizeSpec(
  row: Record<string, unknown>,
  index: number,
  presetId: string,
): StorefrontSeedProductSpec {
  return {
    row_id: String(row.row_id ?? `row-${index + 1}`),
    preset_id: String(row.preset_id ?? presetId),
    name: String(row.name ?? `Product ${index + 1}`),
    sku: row.sku != null ? String(row.sku) : undefined,
    price_usdt: row.price_usdt != null ? String(row.price_usdt) : undefined,
    description: row.description != null ? String(row.description) : undefined,
    image_url: row.image_url != null ? String(row.image_url) : undefined,
    featured: Boolean(row.featured),
    create_listing: row.create_listing !== false,
    quantity: row.quantity != null ? Number(row.quantity) : undefined,
  };
}

const presetSource: IProductSource = {
  kind: 'preset',
  parse(payload, defaults) {
    const rows = (payload.specs ?? payload.rows ?? []) as unknown[];
    const presetId = String(payload.preset_id ?? defaults?.presetId ?? 'marketplace_product');
    return rows
      .filter((r): r is Record<string, unknown> => Boolean(r) && typeof r === 'object')
      .map((row, index) => normalizeSpec(row, index, presetId));
  },
};

const cloneSource: IProductSource = {
  kind: 'clone',
  parse(payload, defaults) {
    return presetSource.parse(payload, defaults);
  },
};

const aiBatchSource: IProductSource = {
  kind: 'ai_batch',
  parse(payload, defaults) {
    const presetId = String(payload.preset_id ?? defaults?.presetId ?? 'marketplace_product');
    const rows = (payload.answers_list ?? payload.products ?? []) as unknown[];
    return rows
      .filter((r): r is Record<string, unknown> => Boolean(r) && typeof r === 'object')
      .map((answers, index) =>
        normalizeSpec(
          {
            row_id: `ai-${index + 1}`,
            name: answers.name,
            price_usdt: answers.price_usdt ?? answers.priceUsdt,
            description: answers.description,
            image_url: answers.image_url ?? answers.imageUrl,
            preset_id: answers.preset_id ?? presetId,
          },
          index,
          presetId,
        ),
      );
  },
};

const magicSource: IProductSource = {
  kind: 'magic',
  parse(payload, defaults) {
    const presetId = String(payload.preset_id ?? defaults?.presetId ?? 'marketplace_product');
    const answers = (payload.answers ?? payload) as Record<string, unknown>;
    if (!answers || typeof answers !== 'object') return [];
    return [normalizeSpec({ ...answers, row_id: 'magic-1' }, 0, presetId)];
  },
};

/** CSV/JSON parsing is server-side; client delegates via REST `ingest`. */
const passthroughSource = (kind: ProductSourceKind): IProductSource => ({
  kind,
  parse(payload, defaults) {
    const rows = (payload.specs ?? payload.rows ?? []) as unknown[];
    const presetId = String(payload.preset_id ?? defaults?.presetId ?? 'marketplace_product');
    return rows
      .filter((r): r is Record<string, unknown> => Boolean(r) && typeof r === 'object')
      .map((row, index) => normalizeSpec(row, index, presetId));
  },
});

const REGISTRY: Record<ProductSourceKind, IProductSource> = {
  preset: presetSource,
  csv: passthroughSource('csv'),
  json: passthroughSource('json'),
  clone: cloneSource,
  ai_batch: aiBatchSource,
  magic: magicSource,
};

export function getProductSource(kind: ProductSourceKind): IProductSource {
  return REGISTRY[kind] ?? presetSource;
}

export function parseProductSource(
  kind: ProductSourceKind,
  payload: ProductSourcePayload,
  defaults?: { presetId?: string },
): StorefrontSeedProductSpec[] {
  return getProductSource(kind).parse(payload, defaults);
}
