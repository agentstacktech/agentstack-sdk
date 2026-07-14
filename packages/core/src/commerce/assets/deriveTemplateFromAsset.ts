import { assetTypeSchema, type AssetPresetDefinition } from './schemas';

type AssetLike = {
  id: string;
  name: string;
  type: string;
  price_usdt?: string;
  components?: Record<string, unknown>;
};

/** Reverse compose: asset → custom template (`core.commerce.project_templates.gen1`). */
export function deriveTemplateFromAsset(asset: AssetLike): AssetPresetDefinition {
  const props = (asset.components?.properties ?? {}) as Record<string, unknown>;
  const meta = (asset.components?.metadata ?? {}) as Record<string, unknown>;
  return {
    id: `tpl_${asset.id.slice(0, 8)}`,
    name: `${asset.name} template`,
    description: String(props.description ?? asset.name),
    category: String(props.category ?? 'general'),
    assetType: assetTypeSchema.parse(asset.type),
    defaultPriceUsdt: asset.price_usdt ?? '0',
    steps: ['basics', 'media', 'publish', 'review'],
    seedComponents: asset.components ?? {},
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', title: 'Name' },
        priceUsdt: { type: 'string', title: 'Price USDT' },
        description: { type: 'string', title: 'Description' },
      },
    },
    postCreateActions: [{ action: 'marketplace.createListing' }],
  };
}
