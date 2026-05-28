import { z } from 'zod';

export const productBundleSchema = z.object({
  listing: z.record(z.unknown()),
  asset_card: z.object({
    id: z.string().optional(),
    name: z.string().optional(),
    description: z.string().optional(),
    thumbnail_url: z.string().optional(),
  }),
  seller: z.object({
    project_id: z.number(),
    display_name: z.string(),
    reputation: z.number().nullable().optional(),
  }),
  policy: z.object({
    rails: z.array(z.string()),
    storefront_public: z.boolean(),
  }),
  buyer_context: z
    .object({
      wallet_balance_usdt: z.string().nullable().optional(),
      can_express: z.boolean().optional(),
    })
    .optional(),
  visibility: z.enum(['public', 'limited']).optional(),
});

export const commerceOrderLineSchema = z.object({
  listing_uuid: z.string().optional(),
  unit_price_usdt: z.string().optional(),
  captured_at: z.string().optional(),
  asset_snapshot: z.record(z.unknown()).optional(),
  seller_project_id: z.number().optional(),
});

export const commerceOrderSchema = z.object({
  order_id: z.string(),
  status: z.string(),
  total_usdt: z.string(),
  lines: z.array(commerceOrderLineSchema),
  created_at: z.string().optional(),
});

export type CommerceOrder = z.infer<typeof commerceOrderSchema>;
