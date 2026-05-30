#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

export function lineCount(filePath) {
  if (!fs.existsSync(filePath)) return 0;
  return fs.readFileSync(filePath, 'utf8').split('\n').length;
}

export function h2Count(text) {
  return [...text.matchAll(/^## (.+)$/gm)].length;
}

export function codeFenceCount(text) {
  const matches = text.match(/```[\w-]*/g);
  return matches ? matches.length : 0;
}

/** EN npm/readme canonical; RU lives in sibling README.md (long legacy) */
export const LEGACY_RU_EXTENDED_EN = new Set([
  'README.en.md',
  'packages/core/README.en.md',
  'packages/react/README.en.md',
  'packages/hooks/README.en.md',
  'packages/python/README.en.md',
]);

const P0_EN_PATHS = new Set([
  'README.en.md',
  'docs/SDK_INTEGRATION_FLOWS.md',
  'docs/INTEGRATOR_SCOPE.md',
  'docs/PROJECT_CONTEXT.md',
  'docs/SUBMODULE_CONSUMER.md',
  'docs/quick-start.md',
  'docs/MODULAR_ARCHITECTURE.md',
  'docs/PROTEIN_SYSTEM_GUIDE.md',
  'packages/core/README.en.md',
  'packages/react/README.en.md',
  'AGENTS.md',
]);

/** @returns {'balanced'|'en-thin'|'ru-thin'|'stub'|'en-only'|'legacy-ru-path'} */
export function syncStatus(pairRole, linesEn, linesRu, enPath) {
  if (pairRole === 'pair-stub') return 'stub';
  if (!linesRu || linesRu === 0) return 'en-only';
  if (!linesEn || linesEn === 0) return 'ru-thin';
  const norm = enPath.replace(/\\/g, '/');
  if (LEGACY_RU_EXTENDED_EN.has(norm)) return 'legacy-ru-path';
  // EN is protocol-first canonical; RU retains legacy depth
  if (norm === 'docs/PROTEIN_SYSTEM_GUIDE.md' && linesEn >= 260) return 'balanced';
  const ratio = linesEn / linesRu;
  if (ratio < 0.6) return 'en-thin';
  if (ratio > 1.4) return 'ru-thin';
  return 'balanced';
}

export function isP0EnPath(enPath) {
  return P0_EN_PATHS.has(enPath.replace(/\\/g, '/'));
}

export { P0_EN_PATHS };
