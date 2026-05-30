#!/usr/bin/env node
/**
 * Guard against misleading API examples in SDK integrator docs (GAP-03).
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const sdkRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

const forbidden = [
  { pattern: /sdk\.projects\.get\s*\(/, message: 'Use sdk.platform.api.getProject(id) or sdk.platform.dna.get — projects is DNATableWrapper' },
  { pattern: /sdk\.admin\./, message: 'sdk.admin is platform-operator only — see docs/INTEGRATOR_SCOPE.md' },
  { pattern: /await sdk\.admin\b/, message: 'sdk.admin is platform-operator only — see docs/INTEGRATOR_SCOPE.md' },
];

const allowAdminIn = new Set([
  'docs/INTEGRATOR_SCOPE.md',
  'docs/INTEGRATOR_SCOPE_ru.md',
  'examples/typescript/operator-admin-usage.ts',
  'examples/react/admin-dashboard.tsx',
]);

function collectEnDocs(dir, relBase, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const rel = relBase ? `${relBase}/${name}` : name;
    if (statSync(p).isDirectory()) {
      if (name === 'node_modules' || name === 'dist') continue;
      collectEnDocs(p, rel, out);
    } else if (name.endsWith('.md') && !name.endsWith('_ru.md') && !name.includes('.ru.')) {
      out.push(rel.replace(/\\/g, '/'));
    }
  }
  return out;
}

const scanFiles = new Set([
  'README.en.md',
  'packages/core/README.en.md',
  'packages/react/README.en.md',
  'packages/hooks/README.en.md',
  'packages/python/README.en.md',
  'docs/MODULAR_ARCHITECTURE.md',
  'docs/AI_APPLICATION_FACTORY.md',
  'docs/PROTEIN_SYSTEM_GUIDE.md',
  'docs/quick-start.md',
  'docs/SDK_INTEGRATION_FLOWS.md',
  'docs/REACT_QUERY_INTEGRATION.md',
  'AGENTS.md',
  ...collectEnDocs(join(sdkRoot, 'docs'), 'docs'),
]);

let failed = false;
for (const rel of scanFiles) {
  const full = join(sdkRoot, rel);
  if (!existsSync(full)) continue;
  if (allowAdminIn.has(rel)) continue;
  let text;
  try {
    text = readFileSync(full, 'utf8');
  } catch {
    continue;
  }
  for (const line of text.split('\n')) {
    if (/Do not|не вызывайте|не используйте|Anti-pattern|Анти-паттерн/i.test(line)) continue;
    for (const { pattern, message } of forbidden) {
      if (pattern.test(line)) {
        console.error(`check-docs-api-symbols: ${rel}: ${message}`);
        failed = true;
      }
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
if (statSync(examplesDir, { throwIfNoEntry: false })?.isDirectory?.()) {
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
