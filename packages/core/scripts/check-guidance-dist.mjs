#!/usr/bin/env node
/**
 * Compass public symbols must remain on `@agentstack/sdk/guidance` d.ts
 * (`sdk.guidance.gen1` / `frontend.platform.compass.gen1`).
 * Skips when dist is absent (pre-build CI).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dts = path.join(root, 'dist', 'guidance', 'index.d.ts');

/** Named imports used by agentstack-frontend platform-compass + project guidance page. */
const REQUIRED = [
  'GuidanceClient',
  'createGuidanceClient',
  'compilePathPlan',
  'buildPathSessionViewModel',
  'runPathReducer',
  'validateGuidanceDefinition',
  'PlaybookStateV2',
  'GoalVerifySpec',
  'questionPhase',
  'LocalPathStore',
  'migrateV1ToV2',
];

if (!fs.existsSync(dts)) {
  console.log('check-guidance-dist: skip (dist/guidance/index.d.ts missing)');
  process.exit(0);
}

const text = fs.readFileSync(dts, 'utf8');
const missing = REQUIRED.filter((name) => !text.includes(name));
if (missing.length) {
  console.error('check-guidance-dist: missing exports:', missing.join(', '));
  process.exit(1);
}
console.log('check-guidance-dist: OK');
