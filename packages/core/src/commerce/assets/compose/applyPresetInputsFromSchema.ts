import type { AssetDraft, AssetPresetDefinition } from '../schemas';
import { deepMerge } from './deepMerge';

const GAME_STAT_KEYS = new Set(['attack', 'hp', 'defense', 'speed']);

/**
 * Maps presetInputs from JSON Schema keys into components (game.stats, metadata.custom_fields).
 */
export function applyPresetInputsFromSchema(
  preset: AssetPresetDefinition,
  inputs: Record<string, unknown>,
  base: AssetDraft['components'],
): AssetDraft['components'] {
  const patch: Record<string, unknown> = {};
  const custom: Record<string, unknown> = {
    ...((base.metadata?.custom_fields as Record<string, unknown>) ?? {}),
  };
  const stats: Record<string, number> = {
    ...(((base.game as Record<string, unknown>)?.stats as Record<string, number>) ?? {}),
  };
  const gameMeta: Record<string, unknown> = {
    ...(((base.game as Record<string, unknown>)?.game_metadata as Record<string, unknown>) ?? {}),
  };

  for (const [key, raw] of Object.entries(inputs)) {
    if (raw === undefined || raw === '') continue;
    if (GAME_STAT_KEYS.has(key)) {
      stats[key] = Number(raw) || 0;
      continue;
    }
    if (key === 'max_stack') {
      patch.properties = {
        ...(patch.properties as Record<string, unknown>),
        max_stack: Number(raw),
      };
      continue;
    }
    if (key === 'display_unit') {
      gameMeta.display_unit = String(raw);
      continue;
    }
    if (key === 'delivery_url' || key === 'shipping_hint' || key === 'listing_price') {
      custom[key] = raw;
      continue;
    }
    if (key === 'buff_template_id') {
      patch.metadata = { buff_template_id: String(raw) };
      continue;
    }
    if (key === 'quote_asset_name') {
      patch.metadata = { exchange_pair: { quote_asset_name: String(raw) } };
      continue;
    }
    if (key === 'bundle_asset_ids') {
      const ids = String(raw)
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      patch.metadata = { bundle_asset_ids: ids };
      continue;
    }
    custom[key] = raw;
  }

  const gamePatch: Record<string, unknown> = {};
  if (Object.keys(stats).length) gamePatch.stats = stats;
  if (Object.keys(gameMeta).length) gamePatch.game_metadata = gameMeta;

  const merged: Record<string, unknown> = { ...patch };
  if (Object.keys(gamePatch).length) {
    merged.game = deepMerge((base.game ?? {}) as Record<string, unknown>, gamePatch);
  }
  if (Object.keys(custom).length) {
    merged.metadata = deepMerge((base.metadata ?? {}) as Record<string, unknown>, {
      custom_fields: custom,
    });
  }

  return deepMerge(base as Record<string, unknown>, merged) as AssetDraft['components'];
}
