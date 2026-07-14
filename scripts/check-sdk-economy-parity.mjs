#!/usr/bin/env node
/**
 * Smoke check: economy SDK clients map to /agentnet and admin testnet paths.
 * genetic: sdk.economy.gen1 · core.economy.agentnet.testnet_plane.gen1
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
const testnetSrc = readFileSync(
  join(root, 'packages/core/src/economy/clients/TestnetClient.ts'),
  'utf8',
);
const chainSurfaceSrc = readFileSync(
  join(root, 'packages/core/src/economy/clients/ChainSurfaceClient.ts'),
  'utf8',
);
const publicGrantsSrc = readFileSync(
  join(root, 'packages/core/src/public/grants/PublicGrantsClient.ts'),
  'utf8',
);
const explorerSrc = readFileSync(
  join(root, 'packages/core/src/economy/agentnetExplorer.ts'),
  'utf8',
);
const identitySrc = readFileSync(
  join(root, 'packages/core/src/economy/agentnetIdentity.ts'),
  'utf8',
);
const economyFixture = JSON.parse(
  readFileSync(join(root, '../shared/fixtures/agentnet_economy_v1.json'), 'utf8'),
);
const agentAdminSrc = readFileSync(
  join(root, 'packages/core/src/modules/AgentAdmin.ts'),
  'utf8',
);
const sdkSrc = readFileSync(join(root, 'packages/core/src/sdk.ts'), 'utf8');

const ledgerPaths = [
  '/agentnet/${projectId}/balance',
  '/agentnet/${projectId}/compute-credits/quote',
  '/agentnet/${projectId}/compute-credits/purchase',
];

const testnetPaths = [
  '/admin/agentnet/testnet',
  '/admin/agentnet/testnet/ops-kpis',
  '/admin/agentnet/faucet-mint',
  'scenarios/',
  'getOpsKpis',
];

const chainSurfacePaths = [
  '/agentnet/chain-surface',
  '/admin/agentnet/chain-surface',
  '/public/grants/chain-surface',
];

const publicGrantsPaths = ['/public/grants', 'evidence-snapshot', 'batches/'];

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
if (/\b(public|this)\s+agentcoin\b/.test(sdkSrc)) {
  console.error('sdk.ts must not expose sdk.agentcoin — use sdk.economy / sdk.platform.economy');
  process.exit(1);
}
if (!sdkSrc.includes('public: AgentPublicSurface') && !sdkSrc.includes('public = new AgentPublicSurface')) {
  console.error('sdk.ts must expose sdk.public (AgentPublicSurface)');
  process.exit(1);
}
if (!agentAdminSrc.includes('readonly testnet: TestnetClient')) {
  console.error('AgentAdmin must expose sdk.admin.testnet');
  process.exit(1);
}
if (!agentAdminSrc.includes('readonly chainSurface: ChainSurfaceClient')) {
  console.error('AgentAdmin must expose sdk.admin.chainSurface');
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
      const allowed =
        file.includes('TestnetClient.ts') ||
        file.includes('ChainSurfaceClient.ts');
      if (!allowed) {
        console.error('economy/ must not call /admin/* except Testnet/ChainSurface clients:', file);
        process.exit(1);
      }
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

for (const fragment of testnetPaths) {
  if (!testnetSrc.includes(fragment)) {
    console.error('Missing path fragment in TestnetClient:', fragment);
    process.exit(1);
  }
}

for (const fragment of chainSurfacePaths) {
  if (!chainSurfaceSrc.includes(fragment)) {
    console.error('Missing path fragment in ChainSurfaceClient:', fragment);
    process.exit(1);
  }
}

for (const fragment of publicGrantsPaths) {
  if (!publicGrantsSrc.includes(fragment)) {
    console.error('Missing path fragment in PublicGrantsClient:', fragment);
    process.exit(1);
  }
}

if (!workingSetSrc.includes('/agentnet/working-set')) {
  console.error('Missing /agentnet/working-set in WorkingSetClient');
  process.exit(1);
}

for (const chainId of [97, 421614, 84532]) {
  if (!explorerSrc.includes(String(chainId))) {
    console.error('agentnetExplorer missing chain', chainId);
    process.exit(1);
  }
}

const fixtureChecks = [
  ['network.id', economyFixture.network?.id, 'agentnet'],
  ['network.displayName', economyFixture.network?.displayName, 'AgentNet'],
  ['native.code', economyFixture.native?.code, 'AGNT'],
  ['stable.code', economyFixture.stable?.code, 'AGUSD'],
  ['stable.vaultStandard', economyFixture.stable?.vaultStandard, 'erc4626'],
];
for (const [label, actual, expected] of fixtureChecks) {
  if (actual !== expected) {
    console.error(`agentnet_economy_v1.json ${label}: expected ${expected}, got ${actual}`);
    process.exit(1);
  }
}
for (const [label, snippet] of [
  ['AGENTNET_NETWORK.id', economyFixture.network.id],
  ['AGENTNET_NATIVE.code', economyFixture.native.code],
  ['AGENTNET_STABLE.code', economyFixture.stable.code],
]) {
  if (!identitySrc.includes(`'${snippet}'`) && !identitySrc.includes(`"${snippet}"`)) {
    console.error(`agentnetIdentity.ts missing ${label} (${snippet})`);
    process.exit(1);
  }
}

console.log('check-sdk-economy-parity: ok');
