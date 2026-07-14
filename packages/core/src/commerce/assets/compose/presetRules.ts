import type { AssetDraft } from '../schemas';

export function applyPresetRules(presetId: string, draft: AssetDraft): AssetDraft {
  if (presetId === 'game_currency') {
    return {
      ...draft,
      components: {
        ...draft.components,
        properties: {
          ...draft.components.properties,
          stackable: true,
          tradeable: true,
          category: draft.components.properties?.category ?? 'currency',
        },
      },
    };
  }
  if (presetId === 'marketplace_product') {
    return {
      ...draft,
      components: {
        ...draft.components,
        properties: {
          ...draft.components.properties,
          tradeable: true,
          transferable: true,
        },
        metadata: {
          ...draft.components.metadata,
          lifecycle: draft.components.metadata?.lifecycle ?? 'published',
        },
      },
    };
  }
  return draft;
}
