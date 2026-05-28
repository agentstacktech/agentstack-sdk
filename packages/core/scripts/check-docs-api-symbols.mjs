#!/usr/bin/env node
/**
 * Guard against misleading API examples in SDK README (GAP-03).
 */
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const sdkRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const readme = readFileSync(join(sdkRoot, 'README.md'), 'utf8');

const forbidden = [
  { pattern: /sdk\.projects\.get\s*\(/, message: 'Use sdk.platform.api.getProject(id) or sdk.platform.dna.get — projects is DNATableWrapper' },
];

let failed = false;
for (const { pattern, message } of forbidden) {
  if (pattern.test(readme)) {
    console.error(`check-docs-api-symbols: README.md: ${message}`);
    failed = true;
  }
}

if (failed) process.exit(1);
console.log('check-docs-api-symbols: ok');
