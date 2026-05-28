#!/usr/bin/env node
/**
 * Smoke check: finance clients map to /api/finance paths.
 * genetic: sdk.finance.gen1
 */
import { readFileSync, existsSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const portfolioSrc = readFileSync(
  join(root, 'packages/core/src/finance/FinancePortfolioClient.ts'),
  'utf8',
);
const projectSrc = readFileSync(
  join(root, 'packages/core/src/finance/ProjectFinanceClient.ts'),
  'utf8',
);
const swapSrc = readFileSync(
  join(root, 'packages/core/src/finance/sessions/SwapSession.ts'),
  'utf8',
);

const required = [
  ['/api/finance/${projectId}/portfolio', portfolioSrc],
  ['/api/finance/${projectId}/activity', portfolioSrc],
  ['/api/finance/me/dashboard-bundle', portfolioSrc],
  ['/api/finance/projects/${projectId}/portfolio', projectSrc],
  ['/api/finance/projects/${projectId}/fund', projectSrc],
  ['/api/finance/projects/${projectId}/contribute', projectSrc],
  ['/api/finance/projects/${projectId}/contributions', projectSrc],
  ['/api/finance/${this.projectId}/swap/quote', swapSrc],
  ['/api/finance/${this.projectId}/swap/execute', swapSrc],
];

for (const [fragment, src] of required) {
  if (!src.includes(fragment)) {
    console.error('Missing path fragment:', fragment);
    process.exit(1);
  }
}

const sdkSrc = readFileSync(join(root, 'packages/core/src/sdk.ts'), 'utf8');
if (!sdkSrc.includes('finance:') && !sdkSrc.includes('AgentFinanceFacade')) {
  console.error('sdk.ts must expose finance facade');
  process.exit(1);
}

const financeDir = join(root, 'packages/core/src/finance');
for (const ent of readdirSync(financeDir, { withFileTypes: true })) {
  if (!ent.isFile() || !ent.name.endsWith('.ts')) continue;
  const src = readFileSync(join(financeDir, ent.name), 'utf8');
  if (src.includes("'/admin/") || src.includes('"/admin/')) {
    console.error('finance/ must not call /admin/*:', ent.name);
    process.exit(1);
  }
}

if (!existsSync(join(root, 'packages/core/src/finance/index.ts'))) {
  console.error('Missing finance/index.ts');
  process.exit(1);
}

console.log('check-sdk-finance-parity: ok');
