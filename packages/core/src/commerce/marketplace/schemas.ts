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

export const storefrontListingCardSchema = z.object({
  listing_uuid: z.string(),
  seller_project_id: z.number(),
  listing_type: z.string(),
  status: z.string(),
  price_usdt: z.string(),
  asset_id: z.string(),
  asset_card: z.record(z.unknown()).optional(),
  facet: z.record(z.unknown()).optional(),
  fulfillment_mode: z.string().optional(),
  created_at: z.string().optional(),
});

export type StorefrontListingCard = z.infer<typeof storefrontListingCardSchema>;
