#!/usr/bin/env node
/**
 * Smoke check: commerce/assets subpath + AgentAssets.listAssetPresets.
 * genetic: sdk.commerce.assets.gen1
 */
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { findMonorepoFile } from './monorepo-layout.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const core = join(root, 'packages/core');

const pkg = JSON.parse(readFileSync(join(core, 'package.json'), 'utf8'));
if (!pkg.exports?.['./commerce/assets']) {
  console.error('package.json missing export ./commerce/assets');
  process.exit(1);
}

const agentAssets = readFileSync(join(core, 'src/modules/AgentAssets.ts'), 'utf8');
if (!agentAssets.includes('listAssetPresets')) {
  console.error('AgentAssets missing listAssetPresets');
  process.exit(1);
}
if (!agentAssets.includes('/asset-presets')) {
  console.error('AgentAssets listAssetPresets must call /asset-presets');
  process.exit(1);
}

const sdkSchemas = readFileSync(join(core, 'src/commerce/assets/schemas.ts'), 'utf8');
const feSchemasPath = findMonorepoFile(
  root,
  'agentstack-frontend',
  'src',
  'lib',
  'assets',
  'assetDraftSchema.ts',
);
const fePresetPath = findMonorepoFile(
  root,
  'agentstack-frontend',
  'src',
  'lib',
  'assets',
  'assetPresetSchema.ts',
);

for (const literal of [
  "'currency'",
  "'digital_item'",
  "'draft', 'published', 'archived'",
  "'intent'",
  "'review'",
]) {
  if (!sdkSchemas.includes(literal)) {
    console.error('SDK schemas missing:', literal);
    process.exit(1);
  }
}

if (!feSchemasPath || !fePresetPath) {
  console.log('check:commerce-assets-parity: skip frontend schemas (standalone SDK repo)');
} else {
  const feSchemas = readFileSync(feSchemasPath, 'utf8');
  const fePreset = readFileSync(fePresetPath, 'utf8');
  const feReexportsSdk = fePreset.includes('@agentstack/sdk/commerce/assets');
  for (const literal of [
    "'currency'",
    "'digital_item'",
    "'draft', 'published', 'archived'",
    "'intent'",
    "'review'",
  ]) {
    if (!feReexportsSdk && !feSchemas.includes(literal) && !fePreset.includes(literal)) {
      console.error('Frontend schemas missing:', literal);
      process.exit(1);
    }
  }
  if (!feReexportsSdk) {
    console.error('frontend assetPresetSchema should re-export @agentstack/sdk/commerce/assets');
    process.exit(1);
  }
}

const indexCommerce = readFileSync(join(core, 'src/commerce/assets/index.ts'), 'utf8');
for (const sym of [
  'buildAssetsWizardHref',
  'buildProjectAssetsWizardHref',
  'buildProjectAssetsSurfaceHref',
  'validateAssetDraft',
  'duplicateAsset',
  'parseAssetsSearchParams',
]) {
  if (!indexCommerce.includes(sym)) {
    console.error('commerce/assets index missing export:', sym);
    process.exit(1);
  }
}

if (!existsSync(join(core, 'src/commerce/assets/buildAssetsWizardHref.ts'))) {
  console.error('missing buildAssetsWizardHref.ts');
  process.exit(1);
}

console.log('OK: sdk.commerce.assets parity');
