#!/usr/bin/env node
/**
 * Build docs/i18n-manifest.json and docs/I18N_DOC_REGISTRY.md for SDK doc pairs.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SDK_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REPO_ROOT = path.resolve(SDK_ROOT, '..');
const DOCS = path.join(SDK_ROOT, 'docs');
const OUT = path.join(DOCS, 'i18n-manifest.json');
const REGISTRY = path.join(DOCS, 'I18N_DOC_REGISTRY.md');
const MONOREPO_SDK_DOCS = path.join(REPO_ROOT, 'docs', 'sdk');
const MONOREPO_MANIFEST = path.join(MONOREPO_SDK_DOCS, 'i18n-manifest.json');
const MONOREPO_REGISTRY = path.join(MONOREPO_SDK_DOCS, 'I18N_DOC_REGISTRY.md');

const MONOREPO_PAIRS = [
  ['docs/sdk/SDK_SUBMODULE_INTEGRATION.md', 'docs/sdk/SDK_SUBMODULE_INTEGRATION_ru.md', 'paired'],
  ['docs/sdk/SDK_MIRROR_PUBLISH_RUNBOOK.md', 'docs/sdk/SDK_MIRROR_PUBLISH_RUNBOOK_ru.md', 'paired'],
  ['docs/sdk/GENETIC_STARTER_SDK_SLICE.md', 'docs/sdk/GENETIC_STARTER_SDK_SLICE_ru.md', 'paired'],
];

/** [enRelativeFromRepoRoot, ruRelativeFromRepoRoot, pairRole] */
const PAIRS = [
  ['README.en.md', 'README.md', 'pair-stub'],
  ['docs/DOCS_I18N.md', 'docs/DOCS_I18N_ru.md', 'paired'],
  ['docs/DOC_HUB.md', 'docs/DOC_HUB_ru.md', 'paired'],
  ['docs/README.md', 'docs/README_ru.md', 'paired'],
  ['docs/SDK_INTEGRATION_FLOWS.md', 'docs/SDK_INTEGRATION_FLOWS_ru.md', 'paired'],
  ['docs/quick-start.md', 'docs/quick-start_ru.md', 'paired'],
  ['docs/INTEGRATOR_SCOPE.md', 'docs/INTEGRATOR_SCOPE_ru.md', 'paired'],
  ['docs/PROJECT_CONTEXT.md', 'docs/PROJECT_CONTEXT_ru.md', 'paired'],
  ['docs/SUBMODULE_CONSUMER.md', 'docs/SUBMODULE_CONSUMER_ru.md', 'paired'],
  ['AGENTS.md', 'AGENTS_ru.md', 'paired'],
  ['docs/AI_INTEGRATOR_GUIDE.md', 'docs/AI_INTEGRATOR_GUIDE_ru.md', 'paired'],
  ['docs/AI_APPLICATION_FACTORY.md', 'docs/AI_APPLICATION_FACTORY_ru.md', 'paired'],
  ['docs/AI_ERROR_ACTION_MATRIX.md', 'docs/AI_ERROR_ACTION_MATRIX_ru.md', 'paired'],
  ['docs/SDK_DOCS_I18N_ROADMAP.md', 'docs/SDK_DOCS_I18N_ROADMAP_ru.md', 'paired'],
  ['docs/ARCHITECTURE.md', 'docs/ARCHITECTURE_ru.md', 'pair-stub'],
  ['docs/REACT_QUERY_INTEGRATION.md', 'docs/REACT_QUERY_INTEGRATION_ru.md', 'pair-stub'],
  ['packages/core/README.en.md', 'packages/core/README.md', 'pair-stub'],
  ['packages/react/README.en.md', 'packages/react/README.md', 'pair-stub'],
  ['packages/python/README.en.md', 'packages/python/README.md', 'pair-stub'],
  ['packages/hooks/README.en.md', 'packages/hooks/README.md', 'pair-stub'],
  ['docs/MODULAR_ARCHITECTURE.md', 'docs/MODULAR_ARCHITECTURE_ru.md', 'pair-stub'],
  ['docs/PROTEIN_SYSTEM_GUIDE.md', 'docs/PROTEIN_SYSTEM_GUIDE_ru.md', 'pair-stub'],
  ['docs/AI_REACT_SCAFFOLD.md', 'docs/AI_REACT_SCAFFOLD_ru.md', 'paired'],
  ['docs/SDK_MODULE_CATALOG.md', 'docs/SDK_MODULE_CATALOG_ru.md', 'paired'],
  ['CONTRIBUTING.md', 'CONTRIBUTING_ru.md', 'paired'],
  ['PUBLISHING.md', 'PUBLISHING_ru.md', 'paired'],
  ['SECURITY.md', 'SECURITY_ru.md', 'paired'],
  ['examples/ai/README.md', 'examples/ai/README_ru.md', 'paired'],
];

function h2Set(md) {
  return [...md.matchAll(/^## (.+)$/gm)].map((m) => m[1].trim());
}

function main() {
  const seen = new Set();
  const entries = [];

  for (const [enPath, ruPath, pairRole] of PAIRS) {
    for (const rel of [enPath, ruPath]) {
      if (seen.has(rel)) continue;
      seen.add(rel);
      const full = path.join(SDK_ROOT, rel);
      const lang = rel.endsWith('_ru.md') || rel === 'README.md' ? 'ru' : 'en';
      const mirror = rel === enPath ? ruPath : rel === ruPath ? enPath : null;
      const text = fs.existsSync(full) ? fs.readFileSync(full, 'utf8') : '';
      entries.push({
        path: rel.replace(/\\/g, '/'),
        lang,
        h2: text ? h2Set(text) : [],
        pairRole: rel === enPath || rel === ruPath ? pairRole : 'single',
        mirror: mirror ? mirror.replace(/\\/g, '/') : null,
      });
    }
  }

  const generatedAt = new Date().toISOString();
  fs.writeFileSync(OUT, `${JSON.stringify({ generatedAt, entries }, null, 2)}\n`);

  const lines = [
    '# SDK i18n doc registry (auto-generated)',
    '',
    `Generated: ${generatedAt} · Run \`npm run generate:docs-i18n\``,
    '',
    '| File | Lang | Role | Mirror |',
    '|------|------|------|--------|',
    ...entries.map((e) => {
      const base = path.basename(e.path);
      const mirrorBase = e.mirror ? path.basename(e.mirror) : '—';
      return `| ${base} | ${e.lang} | ${e.pairRole} | ${mirrorBase} |`;
    }),
    '',
    'Policy: [DOCS_I18N.md](./DOCS_I18N.md)',
  ];
  fs.writeFileSync(REGISTRY, `${lines.join('\n')}\n`);

  const monoEntries = [];
  for (const [enPath, ruPath, pairRole] of MONOREPO_PAIRS) {
    for (const rel of [enPath, ruPath]) {
      const full = path.join(REPO_ROOT, rel);
      const lang = rel.endsWith('_ru.md') ? 'ru' : 'en';
      const mirror = rel === enPath ? ruPath : enPath;
      const text = fs.existsSync(full) ? fs.readFileSync(full, 'utf8') : '';
      monoEntries.push({
        path: rel.replace(/\\/g, '/'),
        lang,
        pairRole,
        mirror: mirror.replace(/\\/g, '/'),
        h2Count: text ? h2Set(text).length : 0,
      });
    }
  }
  fs.mkdirSync(MONOREPO_SDK_DOCS, { recursive: true });
  fs.writeFileSync(
    MONOREPO_MANIFEST,
    `${JSON.stringify({ generatedAt, entries: monoEntries }, null, 2)}\n`,
  );
  const monoLines = [
    '# Monorepo SDK docs i18n registry (auto-generated)',
    '',
    `Generated: ${generatedAt} · \`npm run generate:docs-i18n\` in agentstack-unified-sdk`,
    '',
    '| EN | RU | Role |',
    '|----|-----|------|',
    ...MONOREPO_PAIRS.map(([en, ru, role]) => {
      return `| [${path.basename(en)}](./${path.basename(en)}) | [${path.basename(ru)}](./${path.basename(ru)}) | ${role} |`;
    }),
  ];
  fs.writeFileSync(MONOREPO_REGISTRY, `${monoLines.join('\n')}\n`);

  console.log(`wrote ${OUT} (${entries.length} entries)`);
  console.log(`wrote ${REGISTRY}`);
  console.log(`wrote ${MONOREPO_MANIFEST} (${monoEntries.length} entries)`);
  console.log(`wrote ${MONOREPO_REGISTRY}`);
}

main();
