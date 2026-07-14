import type { AssetPresetDefinition, AssetPresetsFixture } from '../schemas';
import presetFixture from './data/asset_presets_v1.json';

export interface PresetSource {
  listPresets(): AssetPresetDefinition[];
  getPresetDefinition(presetId: string): AssetPresetDefinition | undefined;
  getVersion(): number;
}

const fixture = presetFixture as AssetPresetsFixture;

/** Default preset catalog bundled at build time (`shared/fixtures/asset_presets_v1.json` parity). */
export const bundledPresetSource: PresetSource = {
  listPresets: () => fixture.presets,
  getPresetDefinition: (presetId) => fixture.presets.find((p) => p.id === presetId),
  getVersion: () => fixture.version,
};

export function createPresetSourceFromFixture(data: AssetPresetsFixture): PresetSource {
  return {
    listPresets: () => data.presets,
    getPresetDefinition: (presetId) => data.presets.find((p) => p.id === presetId),
    getVersion: () => data.version,
  };
}

export const ASSET_PRESETS_VERSION = fixture.version;
