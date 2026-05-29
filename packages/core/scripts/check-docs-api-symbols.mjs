#!/usr/bin/env node
/**
 * Guard against misleading API examples in SDK README (GAP-03).
 */
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const sdkRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const scanFiles = [
  'README.md',
  'docs/MODULAR_ARCHITECTURE.md',
  'docs/AI_APPLICATION_FACTORY.md',
];

const forbidden = [
  { pattern: /sdk\.projects\.get\s*\(/, message: 'Use sdk.platform.api.getProject(id) or sdk.platform.dna.get — projects is DNATableWrapper' },
  { pattern: /sdk\.admin\./, message: 'sdk.admin is platform-operator only — see docs/INTEGRATOR_SCOPE.md' },
  { pattern: /await sdk\.admin\b/, message: 'sdk.admin is platform-operator only — see docs/INTEGRATOR_SCOPE.md' },
];

const allowAdminIn = new Set([
  'docs/INTEGRATOR_SCOPE.md',
  'examples/typescript/operator-admin-usage.ts',
  'examples/react/admin-dashboard.tsx',
]);

let failed = false;
for (const rel of scanFiles) {
  const text = readFileSync(join(sdkRoot, rel), 'utf8');
  for (const { pattern, message } of forbidden) {
    if (pattern.test(text)) {
      console.error(`check-docs-api-symbols: ${rel}: ${message}`);
      failed = true;
    }
  }
}

function walkTs(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const rel = p.slice(sdkRoot.length + 1).replace(/\\/g, '/');
    if (statSync(p).isDirectory()) walkTs(p, out);
    else if (/\.(ts|tsx)$/.test(name) && !allowAdminIn.has(rel)) {
      out.push({ rel, text: readFileSync(p, 'utf8') });
    }
  }
  return out;
}
const examplesDir = join(sdkRoot, 'examples');
if (statSync(examplesDir).isDirectory()) {
  for (const { rel, text } of walkTs(examplesDir)) {
    for (const { pattern, message } of forbidden) {
      if (pattern.test(text)) {
        console.error(`check-docs-api-symbols: ${rel}: ${message}`);
        failed = true;
      }
    }
  }
}

if (failed) process.exit(1);
console.log('check-docs-api-symbols: ok');
