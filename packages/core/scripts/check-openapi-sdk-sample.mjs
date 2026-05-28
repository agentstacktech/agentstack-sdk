#!/usr/bin/env node
/**
 * P2: Sample guard — ensure key SDK module files exist when OpenAPI lists paths.
 * Full drift detection is backlog; this prevents silent deletion of hot modules.
 */
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const src = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'modules');
const required = [
  'AgentAPI.ts',
  'AgentAuth.ts',
  'AgentHosting.ts',
  'AgentIntegrations.ts',
  'AgentSupport.ts',
];

const missing = required.filter((f) => !existsSync(join(src, f)));
if (missing.length) {
  console.error('check-openapi-sdk-sample: missing modules', missing.join(', '));
  process.exit(1);
}
console.log('check-openapi-sdk-sample: ok');
