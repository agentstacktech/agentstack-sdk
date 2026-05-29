#!/usr/bin/env node
/**
 * Paired RU/EN SDK docs: mirror exists, header cross-link, rough ## section count.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SDK_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REPO_ROOT = path.resolve(SDK_ROOT, '..');
const MANIFEST = path.join(SDK_ROOT, 'docs', 'i18n-manifest.json');
const H2_TOLERANCE = 6;

/** Monorepo-only pairs (operator docs under docs/sdk/). */
const MONOREPO_PAIRS = [
  ['docs/sdk/SDK_SUBMODULE_INTEGRATION.md', 'docs/sdk/SDK_SUBMODULE_INTEGRATION_ru.md'],
  ['docs/sdk/SDK_MIRROR_PUBLISH_RUNBOOK.md', 'docs/sdk/SDK_MIRROR_PUBLISH_RUNBOOK_ru.md'],
  ['docs/sdk/GENETIC_STARTER_SDK_SLICE.md', 'docs/sdk/GENETIC_STARTER_SDK_SLICE_ru.md'],
];

function h2Count(text) {
  return [...text.matchAll(/^## (.+)$/gm)].length;
}

function hasCrossLink(text) {
  return /\*\*RU:\*\*|\*\*EN:\*\*|\*\*English|\*\*Русский/i.test(text.slice(0, 1500));
}

function main() {
  const errors = [];
  if (!fs.existsSync(MANIFEST)) {
    errors.push('Missing docs/i18n-manifest.json — run npm run generate:docs-i18n');
  } else {
    const { entries } = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
    const paired = entries.filter((e) => e.mirror && e.pairRole !== 'single');

    for (const e of paired) {
      const enPath = e.lang === 'en' ? e.path : e.mirror;
      const ruPath = e.lang === 'ru' ? e.path : e.mirror;
      for (const rel of [enPath, ruPath]) {
        const full = path.join(SDK_ROOT, rel);
        if (!fs.existsSync(full)) {
          errors.push(`Missing: ${rel} (pair with ${e.path})`);
        }
      }
      const aPath = path.join(SDK_ROOT, enPath);
      const bPath = path.join(SDK_ROOT, ruPath);
      if (!fs.existsSync(aPath) || !fs.existsSync(bPath)) continue;

      const a = fs.readFileSync(aPath, 'utf8');
      const b = fs.readFileSync(bPath, 'utf8');
      if (!hasCrossLink(a) && !hasCrossLink(b)) {
        errors.push(`${enPath}: missing **EN:**/**RU:** cross-link near top`);
      }
      if (e.pairRole === 'pair-stub') continue;

      const ca = h2Count(a);
      const cb = h2Count(b);
      if (Math.abs(ca - cb) > H2_TOLERANCE) {
        errors.push(`${enPath} vs ${ruPath}: H2 count ${ca} vs ${cb} (±${H2_TOLERANCE})`);
      }
    }

    for (const [enPath, ruPath] of MONOREPO_PAIRS) {
      const aPath = path.join(REPO_ROOT, enPath);
      const bPath = path.join(REPO_ROOT, ruPath);
      if (!fs.existsSync(aPath)) {
        errors.push(`Missing monorepo EN: ${enPath}`);
        continue;
      }
      if (!fs.existsSync(bPath)) {
        errors.push(`Missing monorepo RU: ${ruPath}`);
        continue;
      }
      const a = fs.readFileSync(aPath, 'utf8');
      const b = fs.readFileSync(bPath, 'utf8');
      if (!hasCrossLink(a) && !hasCrossLink(b)) {
        errors.push(`${enPath}: missing **EN:**/**RU:** cross-link`);
      }
    }

    for (const rel of ['README.md', 'README.en.md']) {
      const p = path.join(SDK_ROOT, rel);
      if (!fs.existsSync(p)) continue;
      const text = fs.readFileSync(p, 'utf8').slice(0, 1200);
      if (!/README\.en\.md|README\.md|English|Русский|\*\*Languages:\*\*/i.test(text)) {
        errors.push(`${rel}: missing README language cross-link`);
      }
    }
  }

  if (errors.length) {
    console.error('check-docs-i18n-parity FAILED:\n' + errors.join('\n'));
    process.exit(1);
  }
  console.log('OK: check-docs-i18n-parity');
}

main();
