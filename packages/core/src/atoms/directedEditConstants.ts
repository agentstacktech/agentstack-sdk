/**
 * Directed-edit vocabulary (behavioral SoT: shared/atoms/edit_intent.py).
 */

import type { DirectedEditOpKind } from '../types/entities/Project';

/** Mirrors Python ``DIRECTED_EDIT_OPS``. */
export const DIRECTED_EDIT_OPS: readonly DirectedEditOpKind[] = [
  'set',
  'replace',
  'delete',
  'merge',
  'upsert',
  'append',
  'prepend',
  'insert_at',
  'insert_before',
  'insert_after',
  'move',
  'search_replace',
  'fuzzy_replace',
  'unified_diff',
] as const;

export const MAX_EDIT_OPS = 16;
