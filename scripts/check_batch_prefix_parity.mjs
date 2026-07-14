#!/usr/bin/env node
/**
 * CI: SDK normalizeBatchSubUrl prefixes must cover backend BATCH_API_RELATIVE_PREFIXES.
 * SSOT: shared/fixtures/batch_api_prefixes_v1.json
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const fixturePath = path.join(root, 'shared/fixtures/batch_api_prefixes_v1.json');
const batchPy = path.join(root, 'agentstack-core/endpoints/batch_endpoints.py');
const batcherTs = path.join(
  root,
  'agentstack-unified-sdk/packages/core/src/utils/request-batcher.ts',
);

function readFixture() {
  const raw = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
  return new Set(
    (raw.relative_prefixes || []).map((p) => p.replace(/\/$/, '') || p),
  );
}

function extractTsPrefixes(src) {
  const m = src.match(/const prefixes = \[([\s\S]*?)\];/);
  if (!m) throw new Error('prefixes array not found in request-batcher.ts');
  return [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1].replace(/\/$/, '') || x[1]);
}

function extractPyPrefixes(src) {
  const m = src.match(/BATCH_API_RELATIVE_PREFIXES[^=]*=\s*\(([\s\S]*?)\)\s*\n\nBATCH_API_SUBSTRING/);
  if (!m) throw new Error('BATCH_API_RELATIVE_PREFIXES not found');
  return [...m[1].matchAll(/"([^"]+)"/g)].map((x) => x[1].replace(/\/$/, '') || x[1]);
}

function norm(p) {
  return p.startsWith('/') ? p : `/${p}`;
}

const fixture = readFixture();
const ts = new Set(extractTsPrefixes(fs.readFileSync(batcherTs, 'utf8')));
const py = new Set(extractPyPrefixes(fs.readFileSync(batchPy, 'utf8')));

const required = ['/commerce', '/integrations', '/hosting', '/fabric'];
let failed = false;

for (const p of required) {
  const n = norm(p);
  if (!ts.has(n)) {
    console.error(`FAIL: request-batcher missing prefix ${n}`);
    failed = true;
  }
  if (!py.has(n) && ![...py].some((x) => x === n || x.startsWith(`${n}/`))) {
    console.error(`FAIL: batch_endpoints missing prefix ${n}`);
    failed = true;
  }
  if (!fixture.has(n) && ![...fixture].some((x) => x === n || x.startsWith(`${n}/`))) {
    console.error(`FAIL: fixture missing prefix ${n}`);
    failed = true;
  }
}

if (failed) process.exit(1);
console.log('check_batch_prefix_parity: ok');
