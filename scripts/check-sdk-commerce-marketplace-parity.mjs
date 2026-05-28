#!/usr/bin/env node
/**
 * Smoke check: commerce/marketplace + checkout/cart exports.
 * genetic: sdk.commerce.marketplace.gen1
 */
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const core = join(root, 'packages/core');
const fixture = join(
  root,
  '../shared/fixtures/marketplace_examples_v1.json',
);

const pkg = JSON.parse(readFileSync(join(core, 'package.json'), 'utf8'));
for (const sub of ['./commerce/marketplace', './commerce/checkout', './commerce/cart', './commerce']) {
  if (!pkg.exports?.[sub]) {
    console.error('package.json missing export', sub);
    process.exit(1);
  }
}

const sdkTs = readFileSync(join(core, 'src/sdk.ts'), 'utf8');
if (!sdkTs.includes('listStorefront')) {
  console.error('sdk.ts missing commerce.listStorefront');
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

if (!existsSync(fixture)) {
  console.error('missing shared/fixtures/marketplace_examples_v1.json');
  process.exit(1);
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
