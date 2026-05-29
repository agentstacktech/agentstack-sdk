#!/usr/bin/env node
/**
 * User-facing docs must use production host agentstack.tech (not legacy domains).
 */
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';
import { fileURLToPath } from 'url';

const sdkRoot = join(fileURLToPath(import.meta.url), '..', '..', '..');

/** Legacy or wrong hosts — use https://agentstack.tech/api */
const LEGACY_HOST = [
  { pattern: /api\.agentstack\.com/i, hint: 'Use https://agentstack.tech/api' },
  { pattern: /api\.agentstack\.tech/i, hint: 'Use https://agentstack.tech/api (no api. subdomain)' },
  { pattern: /docs\.agentstack\.com/i, hint: 'Use https://agentstack.tech/swagger or /api-docs' },
  { pattern: /support@agentstack\.com/i, hint: 'Use GitHub issues or dev@agentstack.tech' },
  {
    pattern: /github\.com\/agentstack\/(?!tech)/i,
    hint: 'Use https://github.com/agentstacktech/agentstack-sdk',
  },
];

function walk(dir, acc = [], ext = /\.md$/i) {
  if (!statSync(dir, { throwIfNoEntry: false })) return acc;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (name === 'node_modules' || name === 'dist') continue;
    const st = statSync(p);
    if (st.isDirectory()) walk(p, acc, ext);
    else if (ext.test(name)) acc.push(p);
  }
  return acc;
}

const mdFiles = new Set();
for (const r of [
  join(sdkRoot, 'README.md'),
  join(sdkRoot, 'AGENTS.md'),
  join(sdkRoot, 'AI_INDEX.md'),
  join(sdkRoot, 'CHANGELOG.md'),
  join(sdkRoot, 'CONTRIBUTING.md'),
  join(sdkRoot, 'SECURITY.md'),
  join(sdkRoot, 'PUBLISHING.md'),
  join(sdkRoot, 'docs'),
  join(sdkRoot, 'examples'),
  join(sdkRoot, 'packages'),
]) {
  if (statSync(r, { throwIfNoEntry: false })?.isFile()) mdFiles.add(r);
  else walk(r).forEach((f) => mdFiles.add(f));
}

const codeFiles = walk(join(sdkRoot, 'examples'), [], /\.(ts|tsx|py)$/i);

let failed = false;

function checkFile(file) {
  const rel = relative(sdkRoot, file).replace(/\\/g, '/');
  if (rel.includes('__tests__') || rel.includes('/dist/')) return;
  const inLocalSection = /## Local development/i.test(readFileSync(file, 'utf8'));
  const lines = readFileSync(file, 'utf8').split('\n');
  let section = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^## /.test(line)) section = line;

    for (const { pattern, hint } of LEGACY_HOST) {
      if (!pattern.test(line)) continue;
      if (/do not use legacy|not use legacy|legacy hosts/i.test(line)) continue;
      console.error(`check-docs-urls: ${rel}:${i + 1}: ${hint}`);
      console.error(`  ${line.trim()}`);
      failed = true;
    }

    if (
      /api_base\s*=\s*['"]https:\/\/agentstack\.tech['"]/i.test(line) ||
      /apiBase\s*:\s*['"]https:\/\/agentstack\.tech['"]/i.test(line)
    ) {
      console.error(`check-docs-urls: ${rel}:${i + 1}: use https://agentstack.tech/api`);
      failed = true;
    }

    if (/localhost:8000/.test(line) && !/localhost:8000\/api/.test(line)) {
      if (inLocalSection && /local development|Local Core/i.test(section + line)) continue;
      console.error(
        `check-docs-urls: ${rel}:${i + 1}: local Core URL must include /api — http://localhost:8000/api`,
      );
      console.error(`  ${line.trim()}`);
      failed = true;
    }

    if (!/localhost|127\.0\.0\.1/.test(line)) continue;
    if (inLocalSection && /local development|Local Core/i.test(section + line)) continue;
    if (/localhost:8000\/api/.test(line)) continue;
    console.error(`check-docs-urls: ${rel}:${i + 1}: document localhost only under ## Local development`);
    console.error(`  ${line.trim()}`);
    failed = true;
  }
}

for (const file of mdFiles) checkFile(file);
for (const file of codeFiles) checkFile(file);

if (failed) {
  console.error('Canonical: https://agentstack.tech/api · Swagger: https://agentstack.tech/swagger');
  process.exit(1);
}
console.log('check-docs-urls: ok');
