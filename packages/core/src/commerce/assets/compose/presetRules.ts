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
  if (presetId === 'project_orchestrator_pack_v2') {
    const packName =
      (draft.components.metadata?.custom_fields as Record<string, unknown>)?.pack_name;
    return {
      ...draft,
      name: packName ? String(packName) : draft.name,
      components: {
        ...draft.components,
        properties: {
          ...draft.components.properties,
          category: 'project_orchestrator',
          tradeable: true,
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
