/**
 * @agentstack/sdk/commerce/assets — catalog definitions + wizard deep links.
 * Genetic tag: `sdk.commerce.assets.gen1`
 */

export {
  assetTypeSchema,
  assetsWizardStepSchema,
  postCreateActionSchema,
  assetPresetDefinitionSchema,
  assetPresetAnswersSchema,
  assetComponentsSchema,
  assetDraftSchema,
  assetPresetsFixtureSchema,
  validateAssetDraft,
  validateAssetPresetsResponse,
} from './schemas';

export type {
  AssetType,
  AssetsWizardStep,
  PostCreateAction,
  AssetPresetDefinition,
  AssetPresetAnswers,
  AssetDraft,
  AssetPresetsFixture,
} from './schemas';

export {
  parseAssetsSearchParams,
  writeAssetsSearchParams,
  buildAssetsModuleSearchParams,
} from './assetsUrlState';

export type {
  AssetsUrlState,
  AssetsWorkspaceMode,
  AssetsCatalogView,
  AssetLifecycleFilter,
  CommerceHubTab,
  StudioTab,
} from './assetsUrlState';

export { buildAssetsWizardHref } from './buildAssetsWizardHref';

export {
  buildAssetsProjectPath,
  buildProjectAssetsSurfaceHref,
  buildProjectAssetsWizardHref,
  buildProjectAssetsExpertHref,
  buildProjectAssetsImportHref,
  buildProjectAssetsCommerceHref,
  buildProjectStorefrontStudioHref,
} from './buildProjectAssetsSurfaceHref';

export type { AssetsProjectShell } from './buildProjectAssetsSurfaceHref';

export { duplicateAsset } from './duplicateAsset';

export {
  deepMerge,
  applyPresetInputsFromSchema,
  mapAnswersToComponents,
  applyPresetRules,
  composeAssetFromPreset,
  bundledPresetSource,
  createPresetSourceFromFixture,
  ASSET_PRESETS_VERSION,
} from './compose';

export type { PresetSource } from './compose';

export { autoSku, autoSlug, autoTags, defaultPrice, defaultImagePlaceholder } from './smartDefaults';
export { deriveTemplateFromAsset } from './deriveTemplateFromAsset';

export {
  newStudioBulkRow,
  assetDraftToStudioBulkRow,
  type StudioBulkProductRow,
} from './studioBulkRow';
