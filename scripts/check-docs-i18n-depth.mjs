#!/usr/bin/env node
/**
 * Depth parity: line ratio + code fence count for paired docs (not pair-stub).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  lineCount,
  codeFenceCount,
  syncStatus,
  isP0EnPath,
  LEGACY_RU_EXTENDED_EN,
} from './lib/docs-i18n-utils.mjs';

const SDK_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MANIFEST = path.join(SDK_ROOT, 'docs', 'i18n-manifest.json');
const RATIO_MIN = 0.6;
const RATIO_MAX = 1.4;
const FENCE_TOLERANCE = 6;

const LEGACY_RU_README_EN = LEGACY_RU_EXTENDED_EN;

const MIN_EN_LINES = {
  'README.en.md': 280,
  'packages/core/README.en.md': 200,
  'packages/react/README.en.md': 150,
  'packages/hooks/README.en.md': 65,
  'packages/python/README.en.md': 75,
  'docs/PROTEIN_SYSTEM_GUIDE.md': 260,
};

/** P0 docs where EN is canonical narrative but RU legacy is much longer */
const MIN_EN_INSTEAD_OF_RATIO = new Set([
  'docs/PROTEIN_SYSTEM_GUIDE.md',
]);

function main() {
  const errors = [];
  const warns = [];
  if (!fs.existsSync(MANIFEST)) {
    console.error('Missing i18n-manifest.json');
    process.exit(1);
  }
  const { entries } = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
  const seen = new Set();

  for (const e of entries) {
    if (!e.mirror || e.pairRole === 'single') continue;
    const enPath = e.lang === 'en' ? e.path : e.mirror;
    const ruPath = e.lang === 'ru' ? e.path : e.mirror;
    const key = [enPath, ruPath].sort().join('|');
    if (seen.has(key)) continue;
    seen.add(key);

    if (e.pairRole === 'pair-stub') {
      if (isP0EnPath(enPath)) {
        warns.push(`${enPath}: P0 doc still pair-stub`);
      }
      continue;
    }

    const enFull = path.join(SDK_ROOT, enPath);
    const ruFull = path.join(SDK_ROOT, ruPath);
    const linesEn = lineCount(enFull);
    const linesRu = lineCount(ruFull);
    const status = syncStatus(e.pairRole, linesEn, linesRu, enPath);

    const legacyRuReadme = LEGACY_RU_README_EN.has(enPath);
    const minEnInsteadOfRatio = MIN_EN_INSTEAD_OF_RATIO.has(enPath);

    if (legacyRuReadme) {
      const minLines = MIN_EN_LINES[enPath] ?? 40;
      if (linesEn < minLines) {
        errors.push(`${enPath}: EN readme ${linesEn} lines (min ${minLines} for legacy RU pair)`);
      }
    } else if (minEnInsteadOfRatio) {
      const minLines = MIN_EN_LINES[enPath] ?? 200;
      if (linesEn < minLines) {
        errors.push(`${enPath}: EN ${linesEn} lines (min ${minLines})`);
      }
    } else if (status === 'en-thin' || status === 'ru-thin') {
      const ratio = linesRu ? (linesEn / linesRu).toFixed(2) : 'n/a';
      const msg = `${enPath}: ${status} (${linesEn}/${linesRu} lines, ratio ${ratio})`;
      if (isP0EnPath(enPath)) errors.push(msg);
      else warns.push(msg);
    } else if (status === 'stub' && isP0EnPath(enPath)) {
      errors.push(`${enPath}: stub status on P0 path`);
    }

    if (!legacyRuReadme && !minEnInsteadOfRatio && linesEn && linesRu) {
      const ratio = linesEn / linesRu;
      if (ratio < RATIO_MIN || ratio > RATIO_MAX) {
        if (!errors.some((x) => x.startsWith(enPath))) {
          const msg = `${enPath}: line ratio ${ratio.toFixed(2)} outside ${RATIO_MIN}–${RATIO_MAX}`;
          if (isP0EnPath(enPath)) errors.push(msg);
          else warns.push(msg);
        }
      }
    }

    const enText = fs.existsSync(enFull) ? fs.readFileSync(enFull, 'utf8') : '';
    const ruText = fs.existsSync(ruFull) ? fs.readFileSync(ruFull, 'utf8') : '';
    const fc = codeFenceCount(enText);
    const fr = codeFenceCount(ruText);
    if (
      !legacyRuReadme &&
      !minEnInsteadOfRatio &&
      Math.abs(fc - fr) > FENCE_TOLERANCE &&
      isP0EnPath(enPath)
    ) {
      errors.push(`${enPath}: code fences ${fc} vs ${fr} (±${FENCE_TOLERANCE})`);
    }
  }

  if (warns.length) {
    console.warn('check-docs-i18n-depth warnings:\n' + warns.join('\n'));
  }
  if (errors.length) {
    console.error('check-docs-i18n-depth FAILED:\n' + errors.join('\n'));
    process.exit(1);
  }
  console.log('OK: check-docs-i18n-depth');
}

main();
