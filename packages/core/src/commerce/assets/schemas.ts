/**
 * Catalog asset draft + wizard schemas (`sdk.commerce.assets.gen1`).
 * Parity with agentstack-frontend/src/lib/assets/* and shared validation.
 */
import { z } from 'zod';

export const assetTypeSchema = z.enum([
  'currency',
  'digital_item',
  'physical_item',
  'service',
  'nft',
]);

export const assetsWizardStepSchema = z.enum([
  'intent',
  'basics',
  'media',
  'publish',
  'review',
]);

export const postCreateActionSchema = z.object({
  action: z.string(),
  optional: z.boolean().optional(),
  templateId: z.string().optional(),
  section: z.string().optional(),
});

export const assetPresetDefinitionSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  category: z.string(),
  assetType: assetTypeSchema,
  defaultPriceUsdt: z.string(),
  steps: z.array(assetsWizardStepSchema),
  seedComponents: z.record(z.unknown()),
  inputSchema: z.record(z.unknown()),
  postCreateActions: z.array(postCreateActionSchema).default([]),
});

export const assetPresetAnswersSchema = z.object({
  name: z.string().min(1),
  priceUsdt: z.string().optional(),
  description: z.string().optional(),
  presetInputs: z.record(z.unknown()).optional(),
  crossProject: z.boolean().optional(),
  createListing: z.boolean().optional(),
  listingPrice: z.string().optional(),
  imageUrl: z.string().optional(),
  iconUrl: z.string().optional(),
  rarity: z.string().optional(),
  tags: z.array(z.string()).optional(),
  category: z.string().optional(),
});

const propertyComponentSchema = z
  .object({
    description: z.string().optional(),
    rarity: z.enum(['common', 'uncommon', 'rare', 'epic', 'legendary']).optional(),
    category: z.string().optional(),
    tags: z.array(z.string()).optional(),
    transferable: z.boolean().optional(),
    tradeable: z.boolean().optional(),
    cross_project: z.boolean().optional(),
    stackable: z.boolean().optional(),
    max_stack: z.number().optional(),
  })
  .passthrough();

const visualComponentSchema = z
  .object({
    icon_url: z.string().optional(),
    image_url: z.string().optional(),
    model_url: z.string().optional(),
    animation_url: z.string().optional(),
  })
  .passthrough();

const metadataComponentSchema = z
  .object({
    custom_fields: z.record(z.unknown()).optional(),
    schema_version: z.string().optional(),
    created_by_preset: z.string().optional(),
    lifecycle: z.enum(['draft', 'published', 'archived']).optional(),
    locked_quantity: z.number().optional(),
  })
  .passthrough();

export const assetComponentsSchema = z
  .object({
    properties: propertyComponentSchema.optional(),
    game: z.record(z.unknown()).optional(),
    metadata: metadataComponentSchema.optional(),
    visual: visualComponentSchema.optional(),
    extensions: z.record(z.unknown()).optional(),
  })
  .passthrough();

export const assetDraftSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  type: assetTypeSchema,
  project_id: z.number(),
  price_usdt: z.string(),
  components: assetComponentsSchema,
});

export const assetPresetsFixtureSchema = z.object({
  version: z.number(),
  branchingQuestions: z
    .array(
      z.object({
        id: z.string(),
        title: z.string(),
        options: z.array(
          z.object({
            id: z.string(),
            label: z.string(),
            categories: z.array(z.string()),
          }),
        ),
      }),
    )
    .optional(),
  presets: z.array(assetPresetDefinitionSchema),
});

export type AssetType = z.infer<typeof assetTypeSchema>;
export type AssetsWizardStep = z.infer<typeof assetsWizardStepSchema>;
export type PostCreateAction = z.infer<typeof postCreateActionSchema>;
export type AssetPresetDefinition = z.infer<typeof assetPresetDefinitionSchema>;
export type AssetPresetAnswers = z.infer<typeof assetPresetAnswersSchema>;
export type AssetDraft = z.infer<typeof assetDraftSchema>;
export type AssetPresetsFixture = z.infer<typeof assetPresetsFixtureSchema>;

export function validateAssetDraft(input: unknown): AssetDraft {
  return assetDraftSchema.parse(input);
}

export function validateAssetPresetsResponse(input: unknown): AssetPresetsFixture & { project_id?: number } {
  const base = z
    .object({
      success: z.boolean().optional(),
      project_id: z.number().optional(),
    })
    .passthrough()
    .parse(input);
  assetPresetsFixtureSchema.parse({
    version: base.version,
    branchingQuestions: base.branchingQuestions,
    presets: base.presets,
  });
  return base as AssetPresetsFixture & { project_id?: number };
}
