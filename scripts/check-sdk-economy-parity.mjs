#!/usr/bin/env node
/**
 * Smoke check: LedgerClient public methods map to /agentnet paths in source.
 * genetic: sdk.economy.gen1
 */
import { readFileSync, existsSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const ledgerSrc = readFileSync(
  join(root, 'packages/core/src/economy/clients/LedgerClient.ts'),
  'utf8',
);
const workingSetSrc = readFileSync(
  join(root, 'packages/core/src/economy/workingSet/WorkingSetClient.ts'),
  'utf8',
);

const ledgerPaths = [
  '/agentnet/${projectId}/balance',
  '/agentnet/${projectId}/compute-credits/quote',
  '/agentnet/${projectId}/compute-credits/purchase',
];

const agentsFleet = readFileSync(
  join(root, 'packages/core/src/modules/AgentsFleet.ts'),
  'utf8',
);
if (!agentsFleet.includes('with-agnt-credits')) {
  console.error('AgentsFleet missing with-agnt-credits path');
  process.exit(1);
}
if (agentsFleet.includes('runWithAgcCredits')) {
  console.error('AgentsFleet must not expose deprecated runWithAgcCredits');
  process.exit(1);
}
const sdkSrc = readFileSync(join(root, 'packages/core/src/sdk.ts'), 'utf8');
if (/\b(public|this)\s+agentcoin\b/.test(sdkSrc)) {
  console.error('sdk.ts must not expose sdk.agentcoin — use sdk.economy / sdk.platform.economy');
  process.exit(1);
}
if (existsSync(join(root, 'packages/core/src/modules/AgentCoin.ts'))) {
  console.error('Remove modules/AgentCoin.ts — export LedgerClient from economy/ only');
  process.exit(1);
}

const economyDir = join(root, 'packages/core/src/economy');
function walkTs(dir) {
  const out = [];
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, ent.name);
    if (ent.isDirectory()) out.push(...walkTs(p));
    else if (ent.name.endsWith('.ts')) out.push(p);
  }
  return out;
}
for (const file of walkTs(economyDir)) {
  const src = readFileSync(file, 'utf8');
  for (const line of src.split('\n')) {
    const t = line.trim();
    if (t.startsWith('*') || t.startsWith('//')) continue;
    if (line.includes("'/admin/") || line.includes('"/admin/') || line.includes('`/admin/')) {
      console.error('economy/ must not call /admin/* — use sdk.admin (AgentAdmin):', file);
      process.exit(1);
    }
  }
}
const platformSrc = readFileSync(join(root, 'packages/core/src/platform-surface.ts'), 'utf8');
const iface = platformSrc.slice(
  platformSrc.indexOf('export interface AgentStackPlatformSurface'),
  platformSrc.indexOf('export function buildCapabilityMatrix'),
);
if (/\badmin\s*:\s*\w/.test(iface)) {
  console.error('sdk.platform must not expose admin — use root sdk.admin only');
  process.exit(1);
}

for (const fragment of ledgerPaths) {
  if (!ledgerSrc.includes(fragment)) {
    console.error('Missing path fragment in LedgerClient:', fragment);
    process.exit(1);
  }
}

if (!workingSetSrc.includes('/agentnet/working-set')) {
  console.error('Missing /agentnet/working-set in WorkingSetClient');
  process.exit(1);
}

console.log('check-sdk-economy-parity: ok');
