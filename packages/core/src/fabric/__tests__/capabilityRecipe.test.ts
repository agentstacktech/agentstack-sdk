import { describe, expect, it } from 'vitest';

import {
  capabilityRecipeSchema,
  parseCapabilityRecipe,
  recipeDescriptorId,
} from './capabilityRecipe';

describe('capabilityRecipe', () => {
  it('parses minimal recipe fixture shape', () => {
    const recipe = parseCapabilityRecipe({
      id: 'fabric.plg_ask',
      title: 'PLG Ask',
      description: 'demo',
      steps: [{ id: 'context', capability_id: 'context.get' }],
    });
    expect(recipe.id).toBe('fabric.plg_ask');
    expect(recipe.steps).toHaveLength(1);
  });

  it('recipeDescriptorId adds prefix', () => {
    expect(recipeDescriptorId('fabric.plg_ask')).toBe('recipe.fabric.plg_ask');
    expect(recipeDescriptorId('recipe.fabric.plg_ask')).toBe('recipe.fabric.plg_ask');
  });

  it('schema rejects empty steps', () => {
    expect(() =>
      capabilityRecipeSchema.parse({
        id: 'x',
        title: 'x',
        steps: [],
      }),
    ).toThrow();
  });
});
