#!/usr/bin/env node
/**
 * Ensure commerce/topup dist exports buildTopUpCreateBody (frontend top-up DRY).
 * genetic: sdk.commerce.topup.gen1
 */
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const core = join(root, 'packages/core');
const srcIndex = join(core, 'src/commerce/topup/index.ts');
const esmDist = join(core, 'dist/commerce/topup/index.esm.js');
const dtsDist = join(core, 'dist/commerce/topup/index.d.ts');

if (!existsSync(srcIndex)) {
  console.error('check-sdk-commerce-topup-parity: missing src index');
  process.exit(1);
}

const src = readFileSync(srcIndex, 'utf8');
if (!src.includes('buildTopUpCreateBody')) {
  console.error('check-sdk-commerce-topup-parity: src must export buildTopUpCreateBody');
  process.exit(1);
}

for (const [label, path] of [
  ['dist esm', esmDist],
  ['dist dts', dtsDist],
]) {
  if (!existsSync(path)) {
    console.error(`check-sdk-commerce-topup-parity: missing ${label}: ${path}`);
    process.exit(1);
  }
  const body = readFileSync(path, 'utf8');
  if (!body.includes('buildTopUpCreateBody')) {
    console.error(`check-sdk-commerce-topup-parity: ${label} missing buildTopUpCreateBody export`);
    process.exit(1);
  }
}

console.log('check-sdk-commerce-topup-parity: ok');
