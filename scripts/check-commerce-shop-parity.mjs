#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const pkg = JSON.parse(
  fs.readFileSync(path.join(root, 'packages/core/package.json'), 'utf8'),
);
const exports = pkg.exports ?? {};
const required = ['./commerce/shop', './commerce/merchant'];
for (const sub of required) {
  if (!exports[sub]) {
    console.error(`Missing package export: ${sub}`);
    process.exit(1);
  }
}

const facadePath = path.join(root, 'packages/core/src/commerce/CommerceFacade.ts');
const facade = fs.readFileSync(facadePath, 'utf8');
for (const sym of [
  'discovery',
  'merchant',
  'getProduct',
  'listOffers',
  'getDashboard',
  'getHubSnapshot',
  'listProjectListings',
  'listIncomingOrders',
  'updateListing',
  'syncListingPrice',
  'bulkSyncStalePrices',
  'updateMerchantListing',
]) {
  if (!facade.includes(sym)) {
    console.error(`CommerceFacade missing ${sym}`);
    process.exit(1);
  }
}

const pagesMap = fs.readFileSync(
  path.join(root, '../docs/dual-shell/PAGES_MAP.md'),
  'utf8',
);
if (!pagesMap.includes('/user/shop')) {
  console.error('PAGES_MAP missing /user/shop');
  process.exit(1);
}

console.log('OK: commerce shop parity');
