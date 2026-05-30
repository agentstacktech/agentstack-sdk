#!/usr/bin/env node
/**
 * Legacy RU package READMEs: block copy-paste of removed or renamed SDK APIs.
 * EN canonical: package README.en files (check-docs-api-symbols).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SDK_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const LEGACY_RU_PATHS = [
  'README.md',
  'packages/core/README.md',
  'packages/react/README.md',
  'packages/hooks/README.md',
  'packages/python/README.md',
];

function collectRuDocs(dir, relBase, out = []) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const rel = relBase ? `${relBase}/${name}` : name;
    if (fs.statSync(p).isDirectory()) {
      if (name === 'node_modules' || name === 'archive') continue;
      collectRuDocs(p, rel, out);
    } else if (name.endsWith('_ru.md')) {
      out.push(rel.replace(/\\/g, '/'));
    }
  }
  return out;
}

const docsRu = fs.existsSync(path.join(SDK_ROOT, 'docs'))
  ? collectRuDocs(path.join(SDK_ROOT, 'docs'), 'docs')
  : [];

const SKIP_LINE =
  /устарел|deprecated|не используйте|Do not|README\.en|\*\*нет\*\*|platform\.auth|platform\.api/i;

const FORBIDDEN = [
  { pattern: /\.register\s*\(/, message: 'No sdk.auth.register' },
  { pattern: /\.refreshToken\s*\(/, message: 'Use refresh(), not refreshToken()' },
  { pattern: /ErrorType\b/, message: 'ErrorType removed' },
  { pattern: /trackBulkEvents/, message: 'No trackBulkEvents' },
  { pattern: /getActiveSessions/, message: 'Use getSessions()' },
  { pattern: /revokeSession\s*\(/, message: 'Use terminateSession()' },
  { pattern: /protein\.updateConfig/, message: 'No protein.updateConfig' },
  { pattern: /platform\.api\.getUser\s*\(/, message: 'No platform.api.getUser — use getProjectUsers or auth profile' },
  { pattern: /platform\.api\.get_projects\s*\(/, message: 'TS: getProjects(); Python: sdk.api.get("/projects")' },
  {
    pattern: /sdk\.platform\./,
    message: 'Python SDK has no sdk.platform — use sdk.api / sdk.auth',
    pythonOnly: true,
  },
  { pattern: /support\.listInbox\s*\(/, message: 'Use support.getInbox({ project_id })' },
  { pattern: /wallets\.list\s*\(/, message: 'Use wallets.getWallets()' },
  { pattern: /\bwallets\.create\s*\(/, message: 'Use wallets.createWallet()' },
  { pattern: /platform\.api\.updateUser\s*\(/, message: 'No platform.api.updateUser — use updateProjectUser' },
  { pattern: /neural\.events\.on\s*\(/, message: 'No neural.events.on — use sdk.on or emitEvent' },
  {
    pattern: /sdk\.neural\.events\.emit\s*\(/,
    message: 'TS: use sdk.neural.emitEvent (Python: sdk.neural.events.emit is OK)',
    tsOnly: true,
  },
  { pattern: /neural\.cache\.getByTag\s*\(/, message: 'No neural.cache.getByTag' },
  { pattern: /neural\.cache\.invalidate\s*\(/, message: 'Use neural.cache.invalidateByPattern or invalidateByTag' },
  { pattern: /scheduler\.runTask\s*\(/, message: 'Use executeTask(), not runTask()' },
  { pattern: /scheduler\.stopTask\s*\(/, message: 'Use deactivateTask() or cancelTaskExecution()' },
  { pattern: /scheduler\.getTaskHistory\s*\(/, message: 'Use getTaskExecutions()' },
  { pattern: /payments\.updatePayment\s*\(/, message: 'No updatePayment — cancel or create new payment' },
  { pattern: /payments\.addPaymentMethod\s*\(/, message: 'No addPaymentMethod — use configureProvider / getPaymentMethods' },
  { pattern: /payments\.removePaymentMethod\s*\(/, message: 'No removePaymentMethod on AgentPayments' },
  { pattern: /payments\.setDefaultPaymentMethod\s*\(/, message: 'No setDefaultPaymentMethod on AgentPayments' },
  { pattern: /payments\.createRefund\s*\(/, message: 'Use refundPayment()' },
  { pattern: /payments\.getRefunds\s*\(/, message: 'No getRefunds — use getTransactions / refundPayment' },
  { pattern: /webhooks\.sendNotification\s*\(/, message: 'Use sdk.notifications.createNotification' },
  { pattern: /neural\.setCacheConfig\s*\(/, message: 'No setCacheConfig — use neural.cache.set/get' },
  { pattern: /neural\.getFromCache\s*\(/, message: 'Use neural.cache.get' },
  { pattern: /neural\.setCache\s*\(/, message: 'Use neural.cache.set' },
  { pattern: /neural\.clearCache\s*\(/, message: 'Use neural.cache.delete' },
  { pattern: /error\.statusCode/, message: 'HTTP errors use ServerError.status, not AgentStackError.statusCode' },
];

function main() {
  const errors = [];
  const allPaths = [...new Set([...LEGACY_RU_PATHS, ...docsRu])];
  for (const rel of allPaths) {
    const full = path.join(SDK_ROOT, rel);
    if (!fs.existsSync(full)) continue;
    const lines = fs.readFileSync(full, 'utf8').split('\n');
    lines.forEach((line, i) => {
      if (SKIP_LINE.test(line)) return;
      for (const rule of FORBIDDEN) {
        if (rule.tsOnly && rel === 'packages/python/README.md') continue;
        if (rule.pythonOnly && rel !== 'packages/python/README.md') continue;
        if (rule.pattern.test(line)) {
          errors.push(`${rel}:${i + 1}: ${rule.message}`);
        }
      }
    });
  }
  if (errors.length) {
    console.error('check-docs-legacy-ru-api FAILED:\n' + errors.join('\n'));
    process.exit(1);
  }
  console.log('OK: check-docs-legacy-ru-api');
}

main();
