#!/usr/bin/env node
/**
 * P2 optional: P0 EN docs should reference examples/ or include typescript fences.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { P0_EN_PATHS } from './lib/docs-i18n-utils.mjs';

const SDK_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const P0_WITH_CODE = [
  'README.en.md',
  'docs/quick-start.md',
  'docs/MODULAR_ARCHITECTURE.md',
  'docs/PROTEIN_SYSTEM_GUIDE.md',
  'packages/core/README.en.md',
  'packages/react/README.en.md',
];

function main() {
  const errors = [];
  for (const rel of P0_WITH_CODE) {
    if (!P0_EN_PATHS.has(rel)) continue;
    const full = path.join(SDK_ROOT, rel);
    if (!fs.existsSync(full)) {
      errors.push(`Missing P0 doc: ${rel}`);
      continue;
    }
    const text = fs.readFileSync(full, 'utf8');
    const hasTsFence = /```typescript/.test(text) || /```tsx/.test(text);
    const linksExamples = /examples\//.test(text);
    if (!hasTsFence && !linksExamples) {
      errors.push(`${rel}: expected typescript/tsx fence or examples/ link`);
    }
  }
  if (errors.length) {
    console.error('check-docs-code-samples FAILED:\n' + errors.join('\n'));
    process.exit(1);
  }
  console.log('OK: check-docs-code-samples');
}

main();
