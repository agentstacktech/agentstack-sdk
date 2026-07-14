import type { AssetDraft, AssetPresetAnswers, AssetPresetDefinition } from '../schemas';
import { deepMerge } from './deepMerge';
import { applyPresetInputsFromSchema } from './applyPresetInputsFromSchema';

export function mapAnswersToComponents(
  preset: AssetPresetDefinition,
  answers: AssetPresetAnswers,
): AssetDraft['components'] {
  const base = (preset.seedComponents ?? {}) as AssetDraft['components'];
  const props: Record<string, unknown> = {
    description: answers.description ?? '',
  };
  if (answers.rarity) props.rarity = answers.rarity;
  if (answers.category) props.category = answers.category;
  if (answers.tags?.length) props.tags = answers.tags;
  if (answers.crossProject !== undefined) props.cross_project = answers.crossProject;

  const patch: Record<string, unknown> = {
    properties: props,
    metadata: {
      schema_version: '1',
      created_by_preset: preset.id,
      custom_fields: { ...(base.metadata?.custom_fields as object) },
    },
  };

  if (answers.imageUrl || answers.iconUrl) {
    patch.visual = {
      image_url: answers.imageUrl,
      icon_url: answers.iconUrl,
    };
  }

  const presetInputs = answers.presetInputs ?? {};
  if (presetInputs.variant && typeof presetInputs.variant === 'object') {
    patch.variant = presetInputs.variant;
  }
  if (presetInputs.group_id) {
    (patch.metadata as { custom_fields?: Record<string, unknown> }).custom_fields = {
      ...((patch.metadata as { custom_fields?: Record<string, unknown> }).custom_fields ?? {}),
      group_id: String(presetInputs.group_id),
    };
  }
  if (presetInputs.compare_at_usdt) {
    (patch.metadata as { custom_fields?: Record<string, unknown> }).custom_fields = {
      ...((patch.metadata as { custom_fields?: Record<string, unknown> }).custom_fields ?? {}),
      compare_at_usdt: String(presetInputs.compare_at_usdt),
    };
  }

  const merged = deepMerge(base as Record<string, unknown>, patch) as AssetDraft['components'];
  const inputs = answers.presetInputs ?? {};
  if (Object.keys(inputs).length === 0) return merged;
  return applyPresetInputsFromSchema(preset, inputs, merged);
}
