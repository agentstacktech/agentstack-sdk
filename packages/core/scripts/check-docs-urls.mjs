#!/usr/bin/env node
/**
 * Fail if user-facing markdown uses localhost outside Local development sections.
 */
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';
import { fileURLToPath } from 'url';

const sdkRoot = join(fileURLToPath(import.meta.url), '..', '..', '..');
const BAD = /localhost|127\.0\.0\.1/;

function walk(dir, acc = []) {
  if (!statSync(dir, { throwIfNoEntry: false })) return acc;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (name === 'node_modules' || name === 'dist') continue;
    const st = statSync(p);
    if (st.isDirectory()) walk(p, acc);
    else if (/\.md$/i.test(p)) acc.push(p);
  }
  return acc;
}

const roots = [
  join(sdkRoot, 'README.md'),
  join(sdkRoot, 'AGENTS.md'),
  join(sdkRoot, 'AI_INDEX.md'),
  join(sdkRoot, 'docs'),
  join(sdkRoot, 'examples'),
];

const files = new Set();
for (const r of roots) {
  if (statSync(r, { throwIfNoEntry: false })?.isFile()) files.add(r);
  else walk(r).forEach((f) => files.add(f));
}

let failed = false;
for (const file of files) {
  const rel = relative(sdkRoot, file);
  const text = readFileSync(file, 'utf8');
  const inLocalSection = /## Local development/i.test(text);
  const lines = text.split('\n');
  let section = '';
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^## /.test(line)) section = line;
    if (!BAD.test(line)) continue;
    if (rel.includes('__tests__')) continue;
    if (inLocalSection && /local development|Local Core/i.test(section + line)) continue;
    if (/localhost:8000\/api/.test(line) && /Local Core|AGENTSTACK_API_BASE/.test(line)) continue;
    console.error(`check-docs-urls: ${rel}:${i + 1}: ${line.trim()}`);
    failed = true;
  }
}

if (failed) {
  console.error('Use https://agentstack.tech or document localhost only under ## Local development');
  process.exit(1);
}
console.log('check-docs-urls: ok');
