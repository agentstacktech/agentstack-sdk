#!/usr/bin/env node
/**
 * Build docs/i18n-manifest.json, I18N_DOC_REGISTRY.md, DOC_SYNC_MATRIX.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  lineCount,
  h2Count,
  codeFenceCount,
  syncStatus,
} from './lib/docs-i18n-utils.mjs';

const SDK_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REPO_ROOT = path.resolve(SDK_ROOT, '..');
const DOCS = path.join(SDK_ROOT, 'docs');
const OUT = path.join(DOCS, 'i18n-manifest.json');
const REGISTRY = path.join(DOCS, 'I18N_DOC_REGISTRY.md');
const SYNC_MATRIX = path.join(DOCS, 'DOC_SYNC_MATRIX.md');
const MONOREPO_SDK_DOCS = path.join(REPO_ROOT, 'docs', 'sdk');
const MONOREPO_MANIFEST = path.join(MONOREPO_SDK_DOCS, 'i18n-manifest.json');
const MONOREPO_REGISTRY = path.join(MONOREPO_SDK_DOCS, 'I18N_DOC_REGISTRY.md');

const DIATAXIS = {
  'docs/quick-start.md': 'tutorial',
  'examples/ai/README.md': 'tutorial',
  'docs/SDK_INTEGRATION_FLOWS.md': 'how-to',
  'docs/SUBMODULE_CONSUMER.md': 'how-to',
  'docs/PROJECT_CONTEXT.md': 'how-to',
  'docs/AI_APPLICATION_FACTORY.md': 'how-to',
  'docs/INTEGRATOR_SCOPE.md': 'reference',
  'docs/AI_ERROR_ACTION_MATRIX.md': 'reference',
  'docs/SDK_MODULE_CATALOG.md': 'reference',
  'docs/GLOSSARY.md': 'reference',
  'docs/ARCHITECTURE.md': 'explanation',
  'docs/MODULAR_ARCHITECTURE.md': 'explanation',
  'docs/PROTEIN_SYSTEM_GUIDE.md': 'explanation',
};

const MONOREPO_PAIRS_STATIC = [
  ['docs/SDK_AI_SURFACE.md', 'docs/SDK_AI_SURFACE_ru.md', 'paired'],
  ['docs/SDK_FEATURE_QUICKSTART.md', 'docs/SDK_FEATURE_QUICKSTART_ru.md', 'paired'],
  ['docs/AGENT_PROTOCOL_QUICKSTART.md', 'docs/AGENT_PROTOCOL_QUICKSTART_ru.md', 'paired'],
];

/** Auto-pair docs/** *_ru.md when sibling EN exists (P3-2). */
function discoverMonorepoRuPairs() {
  const seen = new Set(MONOREPO_PAIRS_STATIC.map(([e]) => e));
  const out = [...MONOREPO_PAIRS_STATIC];

  function scanDir(relDir) {
    const abs = path.join(REPO_ROOT, relDir);
    if (!fs.existsSync(abs)) return;
    for (const name of fs.readdirSync(abs)) {
      if (!name.endsWith('_ru.md')) continue;
      const ruPath = path.join(relDir, name).replace(/\\/g, '/');
      const enName = name.replace(/_ru\.md$/, '.md');
      const enPath = path.join(relDir, enName).replace(/\\/g, '/');
      if (!fs.existsSync(path.join(REPO_ROOT, enPath)) || seen.has(enPath)) continue;
      seen.add(enPath);
      out.push([enPath, ruPath, 'paired']);
    }
  }

  scanDir('docs/sdk');
  scanDir('docs/ecosystem');
  return out.sort((a, b) => a[0].localeCompare(b[0]));
}

/** [enPath, ruPath, pairRole] — paths relative to agentstack-unified-sdk root */
const PAIRS = [
  ['README.en.md', 'README.md', 'paired'],
  ['docs/DOCS_I18N.md', 'docs/DOCS_I18N_ru.md', 'paired'],
  ['docs/DOC_HUB.md', 'docs/DOC_HUB_ru.md', 'paired'],
  ['docs/GLOSSARY.md', 'docs/GLOSSARY_ru.md', 'paired'],
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
  ['docs/ARCHITECTURE.md', 'docs/ARCHITECTURE_ru.md', 'paired'],
  ['docs/REACT_QUERY_INTEGRATION.md', 'docs/REACT_QUERY_INTEGRATION_ru.md', 'paired'],
  ['packages/core/README.en.md', 'packages/core/README.md', 'paired'],
  ['packages/react/README.en.md', 'packages/react/README.md', 'paired'],
  ['packages/python/README.en.md', 'packages/python/README.md', 'paired'],
  ['packages/hooks/README.en.md', 'packages/hooks/README.md', 'paired'],
  ['docs/MODULAR_ARCHITECTURE.md', 'docs/MODULAR_ARCHITECTURE_ru.md', 'paired'],
  ['docs/PROTEIN_SYSTEM_GUIDE.md', 'docs/PROTEIN_SYSTEM_GUIDE_ru.md', 'paired'],
  ['docs/AI_REACT_SCAFFOLD.md', 'docs/AI_REACT_SCAFFOLD_ru.md', 'paired'],
  ['docs/SDK_MODULE_CATALOG.md', 'docs/SDK_MODULE_CATALOG_ru.md', 'paired'],
  ['CONTRIBUTING.md', 'CONTRIBUTING_ru.md', 'paired'],
  ['PUBLISHING.md', 'PUBLISHING_ru.md', 'paired'],
  ['SECURITY.md', 'SECURITY_ru.md', 'paired'],
  ['examples/ai/README.md', 'examples/ai/README_ru.md', 'paired'],
  ['examples/typescript/economy/README.md', 'examples/typescript/economy/README_ru.md', 'paired'],
];

function readMeta(rel) {
  const full = path.join(SDK_ROOT, rel);
  if (!fs.existsSync(full)) {
    return { lines: 0, h2: [], fences: 0 };
  }
  const text = fs.readFileSync(full, 'utf8');
  return { lines: lineCount(full), h2: h2Count(text), fences: codeFenceCount(text) };
}

function main() {
  const generatedAt = new Date().toISOString();
  const entries = [];
  const matrixRows = [];

  for (const [enPath, ruPath, pairRole] of PAIRS) {
    const enMeta = readMeta(enPath);
    const ruMeta = readMeta(ruPath);
    const status = syncStatus(pairRole, enMeta.lines, ruMeta.lines, enPath);
    const ratio =
      ruMeta.lines > 0 ? Number((enMeta.lines / ruMeta.lines).toFixed(2)) : null;

    entries.push({
      path: enPath,
      lang: 'en',
      mirror: ruPath,
      pairRole,
      lineCount: enMeta.lines,
      h2Count: enMeta.h2.length,
      codeFences: enMeta.fences,
      syncStatus: status,
      diataxis: DIATAXIS[enPath] ?? null,
    });
    entries.push({
      path: ruPath,
      lang: 'ru',
      mirror: enPath,
      pairRole,
      lineCount: ruMeta.lines,
      h2Count: ruMeta.h2.length,
      codeFences: ruMeta.fences,
      syncStatus: status,
      diataxis: DIATAXIS[enPath] ?? null,
    });

    matrixRows.push({
      enPath,
      ruPath,
      pairRole,
      linesEn: enMeta.lines,
      linesRu: ruMeta.lines,
      ratio,
      status,
      diataxis: DIATAXIS[enPath] ?? '—',
    });
  }

  fs.writeFileSync(OUT, `${JSON.stringify({ generatedAt, entries }, null, 2)}\n`);

  const registryLines = [
    '# SDK i18n doc registry (auto-generated)',
    '',
    `Generated: ${generatedAt} · \`npm run generate:docs-i18n\``,
    '',
    '| EN | RU | Role | Lines EN/RU | Ratio | Status |',
    '|----|-----|------|-------------|-------|--------|',
    ...matrixRows.map((r) => {
      const ratio = r.ratio ?? '—';
      return `| \`${r.enPath}\` | \`${r.ruPath}\` | ${r.pairRole} | ${r.linesEn}/${r.linesRu} | ${ratio} | ${r.status} |`;
    }),
    '',
    'Matrix: [DOC_SYNC_MATRIX.md](./DOC_SYNC_MATRIX.md) · Policy: [DOCS_I18N.md](./DOCS_I18N.md)',
  ];
  fs.writeFileSync(REGISTRY, `${registryLines.join('\n')}\n`);

  const matrixDoc = [
    '# SDK documentation sync matrix',
    '',
    '**Genetic tag:** `repo.platform.sdk.docs_i18n.gen1`',
    '**RU:** [DOC_SYNC_MATRIX_ru.md](./DOC_SYNC_MATRIX_ru.md) (summary)',
    '',
    `Generated: ${generatedAt} · Do not edit by hand — run \`npm run generate:docs-i18n\``,
    '',
    '| EN | RU | Diátaxis | Lines EN | Lines RU | Ratio | Status |',
    '|----|-----|----------|----------|----------|-------|--------|',
    ...matrixRows.map((r) => {
      return `| [${r.enPath}](${r.enPath}) | [${r.ruPath}](${r.ruPath}) | ${r.diataxis} | ${r.linesEn} | ${r.linesRu} | ${r.ratio ?? '—'} | **${r.status}** |`;
    }),
    '',
    'Statuses: **balanced** (0.6–1.4), **legacy-ru-path** (README.en ↔ long RU README.md). See [DOCS_I18N.md](./DOCS_I18N.md).',
  ];
  fs.writeFileSync(SYNC_MATRIX, `${matrixDoc.join('\n')}\n`);

  const monoRows = [];
  const MONOREPO_PAIRS = discoverMonorepoRuPairs();
  for (const [enPath, ruPath, pairRole] of MONOREPO_PAIRS) {
    const enFull = path.join(REPO_ROOT, enPath);
    const ruFull = path.join(REPO_ROOT, ruPath);
    const linesEn = lineCount(enFull);
    const linesRu = lineCount(ruFull);
    monoRows.push({ enPath, ruPath, pairRole, linesEn, linesRu });
  }
  fs.mkdirSync(MONOREPO_SDK_DOCS, { recursive: true });
  fs.writeFileSync(
    MONOREPO_MANIFEST,
    `${JSON.stringify({ generatedAt, pairs: monoRows }, null, 2)}\n`,
  );
  fs.writeFileSync(
    MONOREPO_REGISTRY,
    [
      '# Monorepo SDK docs i18n registry (auto-generated)',
      '',
      `Generated: ${generatedAt}`,
      '',
      '| EN | RU | Lines EN/RU |',
      '|----|-----|-------------|',
      ...monoRows.map((r) => {
        const enLink =
          r.enPath.startsWith('docs/sdk/') ?
            `./${path.basename(r.enPath)}`
          : r.enPath.startsWith('docs/ecosystem/') ?
            `../ecosystem/${path.basename(r.enPath)}`
          : `../${path.basename(r.enPath)}`;
        const ruLink =
          r.ruPath.startsWith('docs/sdk/') ?
            `./${path.basename(r.ruPath)}`
          : r.ruPath.startsWith('docs/ecosystem/') ?
            `../ecosystem/${path.basename(r.ruPath)}`
          : `../${path.basename(r.ruPath)}`;
        return `| [${path.basename(r.enPath)}](${enLink}) | [${path.basename(r.ruPath)}](${ruLink}) | ${r.linesEn}/${r.linesRu} |`;
      }),
    ].join('\n') + '\n',
  );

  console.log(`wrote ${OUT} (${entries.length} entries)`);
  console.log(`wrote ${REGISTRY}`);
  console.log(`wrote ${SYNC_MATRIX}`);
  console.log(`wrote ${MONOREPO_MANIFEST}`);
}

main();
