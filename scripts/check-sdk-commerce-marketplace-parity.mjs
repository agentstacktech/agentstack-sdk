#!/usr/bin/env node
/**
 * Smoke check: commerce/marketplace + checkout/cart exports.
 * genetic: sdk.commerce.marketplace.gen1
 */
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { findMonorepoFile } from './monorepo-layout.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const core = join(root, 'packages/core');
const fixture = findMonorepoFile(root, 'shared', 'fixtures', 'marketplace_examples_v1.json');

const pkg = JSON.parse(readFileSync(join(core, 'package.json'), 'utf8'));
for (const sub of ['./commerce/marketplace', './commerce/checkout', './commerce/cart', './commerce']) {
  if (!pkg.exports?.[sub]) {
    console.error('package.json missing export', sub);
    process.exit(1);
  }
}

const sdkTs = readFileSync(join(core, 'src/sdk.ts'), 'utf8');
const facade = readFileSync(join(core, 'src/commerce/CommerceFacade.ts'), 'utf8');
if (!facade.includes('listStorefront') || !sdkTs.includes('new CommerceFacade')) {
  console.error('sdk.commerce must expose listStorefront via CommerceFacade');
  process.exit(1);
}

const norm = readFileSync(
  join(core, 'src/commerce/marketplace/normalizeListingsResponse.ts'),
  'utf8',
);
if (!norm.includes('listing_uuid')) {
  console.error('normalizeListingsResponse missing storefront row mapping');
  process.exit(1);
}

if (!fixture) {
  console.log('check:commerce-marketplace-parity: skip shared fixture (standalone SDK repo)');
}

const healthClient = join(core, 'src/commerce/marketplace/storefrontHealthClient.ts');
if (!existsSync(healthClient)) {
  console.error('missing storefrontHealthClient.ts');
  process.exit(1);
}

const feNorm = join(
  root,
  '../agentstack-frontend/src/components/marketplace/marketplaceListingsNormalize.ts',
);
if (existsSync(feNorm)) {
  const text = readFileSync(feNorm, 'utf8');
  if (!text.includes('@agentstack/sdk/commerce/marketplace')) {
    console.error('frontend should re-export SDK normalizeListingsResponse');
    process.exit(1);
  }
}

console.log('check:commerce-marketplace-parity OK');
