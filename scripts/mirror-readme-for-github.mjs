#!/usr/bin/env node
/**
 * Prepare GitHub/npm landing README on the public mirror only.
 *
 * Monorepo keeps README.md (RU narrative) + README.en.md (EN canonical).
 * Mirror repo should show English at root README.md for GitHub.
 *
 * Usage (from a clone of agentstacktech/agentstack-sdk):
 *   node scripts/mirror-readme-for-github.mjs --root . --apply
 *
 * Dry-run (default): prints planned file moves.
 */
import fs from 'node:fs';
import path from 'node:path';

function parseArgs(argv) {
  const out = { root: process.cwd(), apply: false };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--apply') out.apply = true;
    else if (argv[i] === '--root' && argv[i + 1]) out.root = argv[++i];
  }
  return out;
}

function main() {
  const { root, apply } = parseArgs(process.argv);
  const en = path.join(root, 'README.en.md');
  const ru = path.join(root, 'README.md');
  const ruArchive = path.join(root, 'README.ru.md');

  if (!fs.existsSync(en)) {
    console.error('mirror-readme-for-github: missing README.en.md');
    process.exit(1);
  }

  const plan = [
    `Archive ${path.basename(ru)} → README.ru.md (if not already)`,
    'Copy README.en.md → README.md (GitHub default)',
  ];
  console.log(apply ? 'Applying:' : 'Dry-run:');
  plan.forEach((l) => console.log(`  - ${l}`));

  if (!apply) {
    console.log('\nRe-run with --apply in the mirror repo only (not AgentStack monorepo).');
    return;
  }

  if (fs.existsSync(ru) && !fs.existsSync(ruArchive)) {
    fs.copyFileSync(ru, ruArchive);
  }
  fs.copyFileSync(en, ru);
  console.log('OK: root README.md is now English (from README.en.md)');
}

main();
