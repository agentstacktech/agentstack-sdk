import type { AssetDraft, AssetPresetAnswers } from '../schemas';
import { assetDraftSchema } from '../schemas';
import { mapAnswersToComponents } from './mapAnswersToComponents';
import { applyPresetRules } from './presetRules';
import { bundledPresetSource, type PresetSource } from './presetSource';

export function composeAssetFromPreset(
  projectId: number,
  presetId: string,
  answers: AssetPresetAnswers,
  source: PresetSource = bundledPresetSource,
): Omit<AssetDraft, 'id'> {
  const preset = source.getPresetDefinition(presetId);
  if (!preset) {
    throw new Error(`Unknown asset preset: ${presetId}`);
  }

  const listingPrice = answers.listingPrice ?? answers.priceUsdt;
  const draft: Omit<AssetDraft, 'id'> = {
    name: answers.name,
    type: preset.assetType,
    project_id: projectId,
    price_usdt: answers.priceUsdt ?? preset.defaultPriceUsdt ?? '0',
    components: mapAnswersToComponents(preset, {
      ...answers,
      priceUsdt: listingPrice ?? answers.priceUsdt,
    }),
  };

  const withRules = applyPresetRules(presetId, draft as AssetDraft);
  assetDraftSchema.parse(withRules);
  return withRules;
}
