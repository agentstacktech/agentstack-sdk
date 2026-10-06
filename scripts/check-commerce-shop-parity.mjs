#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { findMonorepoFile } from './monorepo-layout.mjs';

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

const pagesMapPath = findMonorepoFile(root, 'docs', 'dual-shell', 'PAGES_MAP.md');
if (!pagesMapPath) {
  console.log('check:commerce-shop-parity: skip PAGES_MAP (standalone SDK repo)');
} else {
  const pagesMap = fs.readFileSync(pagesMapPath, 'utf8');
  if (!pagesMap.includes('/user/shop')) {
    console.error('PAGES_MAP missing /user/shop');
    process.exit(1);
  }
}

console.log('OK: commerce shop parity');
