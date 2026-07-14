/**
 * CapabilityRecipe schema — SDK mirror (`sdk.fabric.gen1`, T10.1).
 */
import { z } from 'zod';
import { capabilityParamSchema } from './capabilityDescriptor';

export const capabilityRecipeStepSchema = z.object({
  id: z.string().min(1),
  capability_id: z.string().min(1),
  params: z.record(z.unknown()).default({}),
  output_key: z.string().optional(),
});

export const capabilityRecipeSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().default(''),
  version: z.number().int().min(1).default(1),
  params: z.array(capabilityParamSchema).default([]),
  steps: z.array(capabilityRecipeStepSchema).min(1),
  complexity: z.enum(['simple', 'intermediate', 'advanced']).default('intermediate'),
  genetic_tags: z.array(z.string()).default(['core.fabric.capability_recipe.gen1']),
});

export const capabilityRecipeListResponseSchema = z.object({
  version: z.number().int().min(1),
  count: z.number().int(),
  recipes: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      allowed: z.boolean().optional(),
      recipe: z
        .object({
          id: z.string(),
          step_count: z.number().int(),
          steps: z.array(
            z.object({
              id: z.string(),
              capability_id: z.string(),
            }),
          ),
        })
        .optional(),
    }).passthrough(),
  ),
});

export type CapabilityRecipeStep = z.infer<typeof capabilityRecipeStepSchema>;
export type CapabilityRecipe = z.infer<typeof capabilityRecipeSchema>;
export type CapabilityRecipeListResponse = z.infer<typeof capabilityRecipeListResponseSchema>;

export function parseCapabilityRecipe(input: unknown): CapabilityRecipe {
  return capabilityRecipeSchema.parse(input);
}

export function recipeDescriptorId(recipeId: string): string {
  return recipeId.startsWith('recipe.') ? recipeId : `recipe.${recipeId}`;
}
