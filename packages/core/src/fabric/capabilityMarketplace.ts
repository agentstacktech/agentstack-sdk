/**
 * Capability Marketplace SDK (`sdk.fabric.gen1`, T10.3, B7).
 */
import { z } from 'zod';

export const marketplaceListingKindSchema = z.enum(['recipe', 'bundle']);
export const marketplaceListingSourceSchema = z.enum(['platform', 'community']);
export const marketplaceListingStatusSchema = z.enum([
  'pending_review',
  'published',
  'rejected',
  'archived',
]);

export const marketplaceListingSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().default(''),
  publisher: z.string().default('agentstack'),
  kind: marketplaceListingKindSchema,
  version: z.number().int().min(1).default(1),
  recipe_id: z.string().nullable().optional(),
  capability_ids: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  source: marketplaceListingSourceSchema.default('platform'),
  publisher_project_id: z.number().nullable().optional(),
  published_by: z.number().nullable().optional(),
  published_at: z.number().nullable().optional(),
  status: marketplaceListingStatusSchema.default('published'),
  reviewed_by: z.number().nullable().optional(),
  reviewed_at: z.number().nullable().optional(),
  reject_reason: z.string().nullable().optional(),
});

export const federationSuggestionSchema = z.object({
  source_project_id: z.number().int().min(1),
  consumer_project_id: z.number().int().min(1),
  recommended_scopes: z.array(z.string()).default([]),
  reason: z.string(),
});

export const marketplaceCatalogEntrySchema = z.object({
  listing: marketplaceListingSchema,
  capability_ids: z.array(z.string()),
  required_caps: z.array(z.string()),
  risk_tier: z.string(),
  allowed: z.boolean(),
  deny_reason: z.string().nullable().optional(),
  federation_suggestion: federationSuggestionSchema.nullable().optional(),
});

export const marketplaceCatalogResponseSchema = z.object({
  version: z.number().int(),
  count: z.number().int(),
  listings: z.array(marketplaceCatalogEntrySchema),
});

export const installedMarketplaceListingSchema = z.object({
  listing_id: z.string(),
  kind: marketplaceListingKindSchema,
  recipe_id: z.string().nullable().optional(),
  capability_ids: z.array(z.string()),
  installed_at: z.number(),
  installed_by: z.number(),
  version: z.number().int(),
});

export const publishMarketplaceRequestSchema = z.object({
  title: z.string().min(1),
  description: z.string().default(''),
  kind: marketplaceListingKindSchema,
  recipe_id: z.string().optional(),
  capability_ids: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  listing_id: z.string().optional(),
});

export type MarketplaceListing = z.infer<typeof marketplaceListingSchema>;
export type FederationSuggestion = z.infer<typeof federationSuggestionSchema>;
export type MarketplaceCatalogEntry = z.infer<typeof marketplaceCatalogEntrySchema>;
export type InstalledMarketplaceListing = z.infer<typeof installedMarketplaceListingSchema>;
export type PublishMarketplaceRequest = z.infer<typeof publishMarketplaceRequestSchema>;

export type PublishMarketplaceResponse = {
  success: boolean;
  listing: MarketplaceListing;
};

export type MyMarketplaceListingsResponse = {
  version: number;
  publisher_project_id: number;
  count: number;
  listings: MarketplaceListing[];
};
