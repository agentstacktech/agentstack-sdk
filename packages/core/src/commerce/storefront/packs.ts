/**
 * Bundled storefront seed packs (`sdk.commerce.storefront_seed.gen1`).
 * Parity with `shared/fixtures/storefront_packs_v1.json` + `shared/atoms/storefront_pack.py`.
 */
import { z } from 'zod';

import packsFixture from './data/storefront_packs_v1.json';
import type { StorefrontSeedProductSpec } from './StorefrontSeedClient';

const DEMO_STORE_PREFIX = '/s/2/demo-store/';

export const storefrontPackItemSchema = z.object({
  row_id: z.string().optional(),
  preset_id: z.string().optional(),
  name: z.string(),
  sku: z.string().optional(),
  price_usdt: z.string().optional(),
  fulfillment_mode: z.string().optional(),
  create_listing: z.boolean().optional(),
  featured: z.boolean().optional(),
  quantity: z.number().optional(),
  preset_inputs: z.record(z.unknown()).optional(),
  description: z.string().optional(),
  image_url: z.string().optional(),
  tags: z.array(z.string()).optional(),
  slug: z.string().optional(),
  group_id: z.string().optional(),
  variant: z.record(z.string()).optional(),
  compare_at_usdt: z.string().optional(),
  existing_asset_id: z.string().optional(),
  category: z.string().optional(),
});

export const storefrontPackSeedOptionsSchema = z.object({
  set_featured: z.boolean().optional(),
  auto_accept: z.boolean().optional(),
  listing_type: z.string().optional(),
  whitelist_enabled: z.boolean().optional(),
});

export const storefrontPackSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  seed_options: storefrontPackSeedOptionsSchema.optional(),
  items: z.array(storefrontPackItemSchema),
});

export const storefrontPacksFixtureSchema = z.object({
  version: z.union([z.string(), z.number()]),
  genetic_tag: z.string().optional(),
  description: z.string().optional(),
  packs: z.array(storefrontPackSchema),
});

export type StorefrontPackItem = z.infer<typeof storefrontPackItemSchema>;
export type StorefrontPackSeedOptions = z.infer<typeof storefrontPackSeedOptionsSchema>;
export type StorefrontPack = z.infer<typeof storefrontPackSchema>;
export type StorefrontPacksFixture = z.infer<typeof storefrontPacksFixtureSchema>;

export type StorefrontPackMeta = {
  id: string;
  name: string;
  description: string;
  itemCount: number;
};

const fixture = storefrontPacksFixtureSchema.parse(packsFixture);

function remapDemoImageUrl(imageUrl: string | undefined, projectId: number): string | undefined {
  if (!imageUrl || projectId === 2) return imageUrl;
  if (imageUrl.includes(DEMO_STORE_PREFIX)) {
    return imageUrl.replace(DEMO_STORE_PREFIX, `/s/${projectId}/demo-store/`);
  }
  return imageUrl;
}

function itemToSpec(item: StorefrontPackItem, projectId: number): StorefrontSeedProductSpec {
  const presetInputs: Record<string, unknown> = { ...(item.preset_inputs ?? {}) };
  if (item.category && presetInputs.category === undefined) {
    presetInputs.category = item.category;
  }

  return {
    row_id: item.row_id,
    preset_id: item.preset_id ?? 'marketplace_product',
    name: item.name,
    sku: item.sku,
    price_usdt: item.price_usdt,
    fulfillment_mode: item.fulfillment_mode ?? 'catalog_definition',
    create_listing: item.create_listing ?? true,
    featured: item.featured ?? false,
    quantity: item.quantity ?? 1,
    preset_inputs: Object.keys(presetInputs).length ? presetInputs : undefined,
    description: item.description,
    image_url: remapDemoImageUrl(item.image_url, projectId),
    tags: item.tags,
    slug: item.slug,
    group_id: item.group_id,
    variant: item.variant,
    compare_at_usdt: item.compare_at_usdt,
    existing_asset_id: item.existing_asset_id,
  };
}

/** Pack catalog metadata (no item payloads). */
export function listBundledPacks(): StorefrontPackMeta[] {
  return fixture.packs.map((pack) => ({
    id: pack.id,
    name: pack.name,
    description: pack.description ?? '',
    itemCount: pack.items.length,
  }));
}

/** Resolve a bundled pack id to seed API `ProductSpec` rows. */
export function packToSpecs(packId: string, projectId: number): StorefrontSeedProductSpec[] {
  const needle = packId.trim();
  if (!needle) return [];

  const pack = fixture.packs.find((p) => p.id === needle);
  if (!pack) return [];

  return pack.items.map((item, index) =>
    itemToSpec(
      {
        ...item,
        row_id: item.row_id ?? `${needle}-${index + 1}`,
      },
      projectId,
    ),
  );
}

/** Optional seed options attached to a pack (e.g. set_featured). */
export function packSeedOptions(packId: string): StorefrontPackSeedOptions | undefined {
  const pack = fixture.packs.find((p) => p.id === packId.trim());
  return pack?.seed_options;
}

export const STOREFRONT_PACKS_VERSION = fixture.version;
