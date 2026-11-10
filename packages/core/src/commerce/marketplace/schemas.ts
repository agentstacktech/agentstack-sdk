import { z } from 'zod';

export const listingAssetOfferSchema = z.object({
  type: z.enum(['currency', 'digital_item', 'physical_item']),
  id: z.string(),
  quantity: z.number().int().positive(),
  price_usdt: z.string().optional(),
  price_asset: z
    .object({
      asset_id: z.string(),
      amount: z.string(),
    })
    .optional(),
});

export const listingLifecycleSchema = z.enum([
  'draft',
  'active',
  'pending_deal',
  'sold',
  'cancelled',
  'expired',
]);

/** Parity with `storefront_index_service._asset_card` dict. */
export const storefrontAssetCardSchema = z
  .object({
    id: z.string().optional(),
    name: z.string().optional(),
    description: z.string().optional(),
    thumbnail_url: z.string().optional(),
    image_url: z.string().optional(),
    rarity: z.string().optional(),
    type: z.string().optional(),
    attack: z.number().optional(),
    hp: z.number().optional(),
    level_requirement: z.union([z.string(), z.number()]).optional(),
  })
  .passthrough();

export const storefrontAuctionSnapshotSchema = z
  .object({
    ends_at: z.string().optional(),
    current_bid: z.string().optional(),
    bid_count: z.number().optional(),
    reserve_met: z.boolean().optional(),
    min_next_bid: z.string().optional(),
    anti_snipe_sec: z.number().optional(),
    revision: z.number().optional(),
  })
  .passthrough();

export const storefrontListingCardSchema = z.object({
  listing_uuid: z.string(),
  seller_project_id: z.number(),
  listing_type: z.string(),
  status: z.string(),
  price_usdt: z.string(),
  asset_id: z.string(),
  title: z.string().optional(),
  image_url: z.string().optional(),
  asset_card: storefrontAssetCardSchema.optional(),
  auction: storefrontAuctionSnapshotSchema.optional(),
  facet: z.record(z.unknown()).optional(),
  fulfillment_mode: z.string().optional(),
  created_at: z.string().optional(),
});

export type StorefrontAssetCard = z.infer<typeof storefrontAssetCardSchema>;

export type StorefrontListingCard = z.infer<typeof storefrontListingCardSchema>;
