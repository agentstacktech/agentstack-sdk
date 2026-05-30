#!/usr/bin/env node
/**
 * Validate sdk.<module>.<method>( in EN integrator docs against Agent* module sources.
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const coreRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const sdkRoot = join(coreRoot, '..', '..');
const modulesDir = join(coreRoot, 'src', 'modules');
const protocolFile = join(coreRoot, 'src', 'protocol', 'AgentProtocol.ts');
const economyFile = join(coreRoot, 'src', 'economy', 'AgentEconomyFacade.ts');

const FILE_TO_MODULE = {
  AgentAuth: 'auth',
  AgentAPI: 'api',
  AgentPayments: 'payments',
  AgentAnalytics: 'analytics',
  AgentWebhooks: 'webhooks',
  AgentWallets: 'wallets',
  AgentNotifications: 'notifications',
  AgentScheduler: 'scheduler',
  AgentNeural: 'neural',
  AgentDocs: 'docs',
  AgentDNA: 'dna',
  AgentRBAC: 'rbac',
  AgentIntegrations: 'integrations',
  AgentsFleet: 'agentsFleet',
  AgentHosting: 'hosting',
  AgentSocial: 'social',
  AgentSupport: 'support',
  AgentWebPush: 'webPush',
  AgentInvoices: 'invoices',
  AgentBilling: 'billing',
  AgentI18n: 'i18n',
  AgentLogic: 'logic',
  AgentCommand: 'command',
  AgentEcosystem: 'ecosystem',
  AgentAssets: 'assets',
  AgentGlobalAssets: 'globalAssets',
  AgentBuffs: 'buffs',
  AgentStorage: 'storage',
  AgentMarketplace: 'marketplace',
  AgentProtein: 'protein',
  AgentNetBnb: 'agentnetBnb',
};

const DNA_TABLE_METHODS = new Set(['list', 'get', 'create', 'update', 'delete']);

const SKIP_LINE =
  /Do not|не вызывайте|не используйте|Anti-pattern|Анти-паттерн|устарел|deprecated|README\.en|нет метода/i;

const SCAN_REL = [
  'README.en.md',
  'packages/core/README.en.md',
  'packages/react/README.en.md',
  'packages/hooks/README.en.md',
  'docs/MODULAR_ARCHITECTURE.md',
  'docs/PROTEIN_SYSTEM_GUIDE.md',
  'docs/quick-start.md',
  'docs/SDK_INTEGRATION_FLOWS.md',
  'docs/REACT_QUERY_INTEGRATION.md',
];

const PROTOCOL_DOC_METHODS = [
  'executeCommand',
  'executeCommandsBatch',
  'readThroughSnapshot',
  'invalidateSnapshotPrefix',
  'invalidateSnapshotKey',
  'setSnapshot',
  'readPath',
];

const I18N_DOC_METHODS = [
  't',
  'changeLanguage',
  'getCurrentLanguage',
  'getSupportedLanguages',
  'getAvailableKeys',
  'registerNamespace',
];

function extractMethods(filePath) {
  if (!existsSync(filePath)) return new Set();
  const text = readFileSync(filePath, 'utf8');
  const methods = new Set();
  for (const m of text.matchAll(/^\s+async\s+(\w+)(?:<[^>]*>)?\s*\(/gm)) methods.add(m[1]);
  for (const m of text.matchAll(/^\s+(\w+)\s*(?:<[^>]+>)?\s*\([^)]*\)\s*:\s*Promise/gm)) {
    if (m[1] !== 'constructor') methods.add(m[1]);
  }
  for (const m of text.matchAll(/^\s+(\w+)\s*(?:<[^>]+>)?\s*\([^)]*\)\s*:\s*void\s*\{/gm)) {
    methods.add(m[1]);
  }
  for (const m of text.matchAll(/^\s+(\w+)\s*\([^)]*\)\s*\{/gm)) {
    if (!/^(if|for|while|switch|catch|constructor)$/.test(m[1])) methods.add(m[1]);
  }
  return methods;
}

function buildCatalog() {
  const catalog = {};
  for (const name of readdirSync(modulesDir)) {
    if (!name.endsWith('.ts') || name.includes('.test.')) continue;
    const base = name.replace(/\.ts$/, '');
    const mod = FILE_TO_MODULE[base];
    if (!mod) continue;
    const methods = extractMethods(join(modulesDir, name));
    catalog[mod] = new Set([...(catalog[mod] || []), ...methods]);
  }
  catalog.protocol = new Set([
    ...extractMethods(protocolFile),
    ...PROTOCOL_DOC_METHODS,
  ]);
  catalog.neural = new Set([...(catalog.neural || []), 'on', 'off', 'once', 'emit']);
  catalog.economy = extractMethods(economyFile);
  catalog.projects = DNA_TABLE_METHODS;
  catalog.users = DNA_TABLE_METHODS;
  catalog.i18n = new Set([...(catalog.i18n || []), ...I18N_DOC_METHODS]);
  return catalog;
}

function collectEnDocs(dir, relBase, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const rel = relBase ? `${relBase}/${name}` : name;
    if (statSync(p).isDirectory()) {
      if (name === 'node_modules' || name === 'dist' || name === 'archive') continue;
      collectEnDocs(p, rel, out);
    } else if (name.endsWith('.md') && !name.endsWith('_ru.md')) {
      out.push(rel.replace(/\\/g, '/'));
    }
  }
  return out;
}

const catalog = buildCatalog();
const scanFiles = new Set([
  ...SCAN_REL,
  ...collectEnDocs(join(sdkRoot, 'docs'), 'docs'),
]);

const CALL_RE = /\bsdk\.((?:platform\.)?[\w]+)\.(\w+)\s*\(/g;

function extractTsBlocks(text) {
  const blocks = [];
  const re = /```(?:typescript|tsx)\n([\s\S]*?)```/g;
  let m;
  while ((m = re.exec(text))) blocks.push(m[1]);
  return blocks;
}

function resolveModule(path) {
  if (path.startsWith('platform.')) return path.slice('platform.'.length);
  return path;
}

let failed = false;

for (const rel of scanFiles) {
  const full = join(sdkRoot, rel);
  if (!existsSync(full)) continue;
  const text = readFileSync(full, 'utf8');
  const blocks = extractTsBlocks(text);
  const haystack = blocks.length ? blocks.join('\n') : text;
  const lines = haystack.split('\n');

  lines.forEach((line, i) => {
    if (SKIP_LINE.test(line)) return;
    let m;
    CALL_RE.lastIndex = 0;
    while ((m = CALL_RE.exec(line))) {
      const mod = resolveModule(m[1]);
      const method = m[2];
      const known = catalog[mod];
      if (!known) continue;
      if (!known.has(method)) {
        console.error(
          `check-docs-sdk-method-calls: ${rel}: unknown sdk.${m[1]}.${method}() — not on Agent module`
        );
        failed = true;
      }
    }
  });
}

if (failed) process.exit(1);
console.log('check-docs-sdk-method-calls: ok');
