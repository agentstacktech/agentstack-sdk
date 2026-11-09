/**
 * In-memory directed edit batch (subset port of shared/atoms/edit_intent.py).
 * Gene: shared.atoms.directed_edit.gen1
 */

import {
  deletePath,
  getPath,
  insertAtPath,
  insertRelativeToWhere,
  moveListItem,
  setPath,
} from '../protocol/pathAtom';
import {
  applyUnifiedDiff,
  fuzzySingleReplace,
  insertAfterAnchor,
  insertBeforeAnchor,
} from './textEdit';
import { leafDigestPayloadBytes } from '../util/jsonLeafStringify';
import { sha256HexSync } from '../util/sha256HexSync';
import type { DirectedEditOp } from '../types/entities/Project';

import { DIRECTED_EDIT_OPS, MAX_EDIT_OPS } from './directedEditConstants';
import { mergeListByKey } from './keyedMerge';
import { mergeViewWritebackBlocked, viewWritebackBlocked } from './viewWriteback';

export interface ApplyEditsResult {
  ok: boolean;
  value: unknown;
  error_code?: string;
  error_message?: string;
  methods: string[];
  applied: number;
  skipped: number;
}

export interface ApplyEditsOptions {
  expected_sha256?: string;
  allow_shrink?: boolean;
  missing?: 'error' | 'skip';
  json_window?: number;
  envelope_window?: number;
}

const SHRINK_MIN_OLD = 48_000;
const SHRINK_RATIO = 0.35;

function replaceBodyBlocked(oldLen: number, newLen: number, allowShrink: boolean, window: number): boolean {
  if (allowShrink || oldLen < SHRINK_MIN_OLD) return false;
  return newLen < oldLen * SHRINK_RATIO;
}

export function leafDigest(value: unknown): string {
  return sha256HexSync(leafDigestPayloadBytes(value));
}

function deepMergeKeyed(base: Record<string, unknown>, patch: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...base };
  for (const [key, val] of Object.entries(patch)) {
    const existing = out[key];
    if (existing && typeof existing === 'object' && !Array.isArray(existing) && val && typeof val === 'object' && !Array.isArray(val)) {
      out[key] = deepMergeKeyed(existing as Record<string, unknown>, val as Record<string, unknown>);
    } else {
      out[key] = val;
    }
  }
  return out;
}

function applySearchReplace(text: string, replacements: Array<{ find?: string; replace?: string }>): string | null {
  let out = text;
  for (const pair of replacements) {
    const find = String(pair.find ?? '');
    if (!find) continue;
    const idx = out.indexOf(find);
    if (idx < 0) return null;
    const rest = out.slice(idx + find.length);
    if (rest.includes(find)) {
      throw new Error('ambiguous_anchor');
    }
    out = out.slice(0, idx) + String(pair.replace ?? '') + rest;
  }
  return out;
}

const SKIPPABLE_MISS_CODES = new Set([
  'replacement_not_found',
  'text_anchor_miss',
  'anchor_not_found',
  'ambiguous_anchor',
]);

function shouldSkipOnMiss(missMode: 'error' | 'skip', code: string): boolean {
  return missMode === 'skip' && SKIPPABLE_MISS_CODES.has(code);
}

function fail(
  current: unknown,
  code: string,
  msg: string,
  methods: string[],
  applied: number,
  skipped: number,
): ApplyEditsResult {
  return { ok: false, value: current, error_code: code, error_message: msg, methods, applied, skipped };
}

/** Apply up to MAX_EDIT_OPS ops in memory (fail-closed). */
export function applyEdits(
  root: unknown,
  ops: DirectedEditOp[],
  options: ApplyEditsOptions = {},
): ApplyEditsResult {
  const allowShrink = Boolean(options.allow_shrink);
  const jsonWindow = options.json_window ?? 48_000;
  const envelopeWindow = options.envelope_window ?? 64_000;
  const wbOpts = { jsonWindow, envelopeWindow, allowShrink };
  if (ops.length > MAX_EDIT_OPS) {
    return fail(root, 'too_many_paths', `max ${MAX_EDIT_OPS} ops`, [], 0, 0);
  }
  if (options.expected_sha256) {
    const digest = leafDigest(root);
    if (digest !== String(options.expected_sha256).trim().toLowerCase()) {
      return fail(root, 'text_revision_conflict', 'expected_sha256 mismatch', [], 0, 0);
    }
  }

  const missMode = options.missing ?? 'error';
  let current: unknown = structuredClone(root);
  const methods: string[] = [];
  let applied = 0;
  let skipped = 0;

  for (const raw of ops) {
    const opName = String(raw.op ?? (raw as { kind?: string }).kind ?? '')
      .trim()
      .toLowerCase();
    const alias = opName === 'merge_keyed' || opName === 'put' || opName === 'set' ? (opName === 'merge_keyed' ? 'merge' : opName === 'put' ? 'set' : opName) : opName;
    const resolved = alias === 'merge_keyed' ? 'merge' : alias;
    if (!resolved || !(DIRECTED_EDIT_OPS as readonly string[]).includes(resolved)) {
      return fail(current, 'invalid_parameters', `unknown op: ${opName}`, methods, applied, skipped);
    }
    const relStr = String(raw.path ?? '').trim();

    try {
      if (resolved === 'set' || resolved === 'replace') {
        const val = raw.value;
        if (typeof current === 'object' && current !== null && !Array.isArray(current)) {
          if (relStr) {
            const existing = getPath(current as Record<string, unknown>, relStr);
            if (
              viewWritebackBlocked(existing, val, {
                jsonWindow: wbOpts.jsonWindow,
                envelopeWindow: wbOpts.envelopeWindow,
                allowShrink: wbOpts.allowShrink,
              })
            ) {
              throw new Error('content_shrink_blocked');
            }
            current = setPath(current as Record<string, unknown>, relStr, val, {
              copyRoot: true,
            });
          } else if (
            viewWritebackBlocked(current, val, {
              jsonWindow: wbOpts.jsonWindow,
              envelopeWindow: wbOpts.envelopeWindow,
              allowShrink: wbOpts.allowShrink,
            })
          ) {
            throw new Error('content_shrink_blocked');
          } else {
            current = val;
          }
        } else if (
          viewWritebackBlocked(current, val, {
            jsonWindow: wbOpts.jsonWindow,
            envelopeWindow: wbOpts.envelopeWindow,
            allowShrink: wbOpts.allowShrink,
          })
        ) {
          throw new Error('content_shrink_blocked');
        } else {
          current = val;
        }
        methods.push(resolved);
        applied += 1;
      } else if (resolved === 'merge') {
        const patch = raw.value;
        if (!patch || typeof patch !== 'object' || Array.isArray(patch)) {
          throw new Error('write_mode_unsupported');
        }
        const base =
          relStr && typeof current === 'object' && current !== null
            ? getPath(current as Record<string, unknown>, relStr)
            : current;
        if (!base || typeof base !== 'object' || Array.isArray(base)) {
          throw new Error('write_mode_unsupported');
        }
        if (
          mergeViewWritebackBlocked(base as Record<string, unknown>, patch as Record<string, unknown>, {
            jsonWindow: wbOpts.jsonWindow,
            envelopeWindow: wbOpts.envelopeWindow,
            allowShrink: wbOpts.allowShrink,
          })
        ) {
          throw new Error('content_shrink_blocked');
        }
        const merged = deepMergeKeyed(base as Record<string, unknown>, patch as Record<string, unknown>);
        if (relStr && typeof current === 'object' && current !== null) {
          current = setPath(current as Record<string, unknown>, relStr, merged, {
            copyRoot: true,
          });
        } else {
          current = merged;
        }
        methods.push('merge');
        applied += 1;
      } else if (resolved === 'delete') {
        if (typeof current !== 'object' || current === null || Array.isArray(current) || !relStr) {
          throw new Error('write_mode_unsupported');
        }
        current = deletePath(current as Record<string, unknown>, relStr);
        methods.push('delete');
        applied += 1;
      } else if (resolved === 'search_replace' || resolved === 'fuzzy_replace') {
        const reps = raw.replacements ?? (raw.find != null ? [{ find: raw.find, replace: raw.replace }] : []);
        const target =
          relStr && typeof current === 'object' && current !== null
            ? getPath(current as Record<string, unknown>, relStr)
            : current;
        if (typeof target !== 'string') {
          throw new Error('write_mode_unsupported');
        }
        let next: string;
        if (resolved === 'fuzzy_replace') {
          const [out, err] = fuzzySingleReplace(
            target,
            reps as Array<{ find?: string; replace?: string }>,
          );
          if (err) throw new Error(err);
          next = out;
        } else {
          const replaced = applySearchReplace(target, reps as Array<{ find?: string; replace?: string }>);
          if (replaced === null) {
            throw new Error('replacement_not_found');
          }
          next = replaced;
        }
        if (relStr && typeof current === 'object' && current !== null) {
          current = setPath(current as Record<string, unknown>, relStr, next, {
            copyRoot: true,
          });
        } else {
          current = next;
        }
        methods.push(resolved);
        applied += 1;
      } else if (resolved === 'insert_before' || resolved === 'insert_after') {
        if (typeof current !== 'object' || current === null || Array.isArray(current)) {
          throw new Error('write_mode_unsupported');
        }
        const where = (raw as { where?: Record<string, unknown> }).where;
        const ins = raw.value ?? (raw as { insert?: unknown }).insert;
        if (where && relStr) {
          current = insertRelativeToWhere(
            current as Record<string, unknown>,
            relStr,
            where,
            ins,
            { before: resolved === 'insert_before', copyRoot: true },
          );
        } else if (relStr) {
          const find = String(raw.find ?? '');
          const sub = getPath(current as Record<string, unknown>, relStr);
          if (typeof sub !== 'string') throw new Error('write_mode_unsupported');
          const [newSub, err] =
            resolved === 'insert_before'
              ? insertBeforeAnchor(sub, find, String(ins ?? ''))
              : insertAfterAnchor(sub, find, String(ins ?? ''));
          if (err) throw new Error(err);
          current = setPath(current as Record<string, unknown>, relStr, newSub, { copyRoot: true });
        } else {
          throw new Error('write_mode_unsupported');
        }
        methods.push(resolved);
        applied += 1;
      } else if (resolved === 'move') {
        if (typeof current !== 'object' || current === null || Array.isArray(current) || !relStr) {
          throw new Error('write_mode_unsupported');
        }
        const rawMove = raw as {
          from_index?: number;
          to_index?: number;
          uid?: string;
          before_uid?: string;
        };
        current = moveListItem(current as Record<string, unknown>, relStr, {
          fromIndex: rawMove.from_index,
          toIndex: rawMove.to_index,
          uid: rawMove.uid,
          beforeUid: rawMove.before_uid,
          copyRoot: true,
        });
        methods.push('move');
        applied += 1;
      } else if (resolved === 'upsert') {
        const patch = raw.value;
        const keyField = String((raw as { key?: string }).key ?? 'uid');
        const target =
          relStr && typeof current === 'object' && current !== null && !Array.isArray(current)
            ? getPath(current as Record<string, unknown>, relStr)
            : current;
        if (!Array.isArray(target) || !Array.isArray(patch)) {
          throw new Error('write_mode_unsupported');
        }
        const merged = mergeListByKey(target as unknown[], patch as unknown[], keyField);
        if (relStr && typeof current === 'object' && current !== null && !Array.isArray(current)) {
          current = setPath(current as Record<string, unknown>, relStr, merged, { copyRoot: true });
        } else {
          current = merged;
        }
        methods.push('upsert');
        applied += 1;
      } else if (resolved === 'append' || resolved === 'prepend') {
        const val = raw.value;
        const target =
          relStr && typeof current === 'object' && current !== null && !Array.isArray(current)
            ? getPath(current as Record<string, unknown>, relStr)
            : current;
        if (Array.isArray(target)) {
          const next = resolved === 'append' ? [...target, val] : [val, ...target];
          if (relStr && typeof current === 'object' && current !== null && !Array.isArray(current)) {
            current = setPath(current as Record<string, unknown>, relStr, next, { copyRoot: true });
          } else {
            current = next;
          }
          methods.push(resolved);
          applied += 1;
          continue;
        }
        if (typeof target !== 'string') {
          throw new Error('write_mode_unsupported');
        }
        const next =
          resolved === 'append' ? target + String(val ?? '') : String(val ?? '') + target;
        if (relStr && typeof current === 'object' && current !== null && !Array.isArray(current)) {
          current = setPath(current as Record<string, unknown>, relStr, next, {
            copyRoot: true,
          });
        } else {
          current = next;
        }
        methods.push(resolved);
        applied += 1;
      } else if (resolved === 'unified_diff') {
        const target =
          relStr && typeof current === 'object' && current !== null
            ? getPath(current as Record<string, unknown>, relStr)
            : current;
        if (typeof target !== 'string') {
          throw new Error('write_mode_unsupported');
        }
        const diffText = String(
          (raw as { unified_diff?: string }).unified_diff ?? raw.value ?? '',
        );
        const [next, err] = applyUnifiedDiff(target, diffText, {
          strict: Boolean((raw as { strict_diff?: boolean }).strict_diff),
        });
        if (err) throw new Error(err);
        if (relStr && typeof current === 'object' && current !== null) {
          current = setPath(current as Record<string, unknown>, relStr, next, {
            copyRoot: true,
          });
        } else {
          current = next;
        }
        methods.push('unified_diff');
        applied += 1;
      } else if (resolved === 'insert_at') {
        if (typeof current !== 'object' || current === null || Array.isArray(current)) {
          throw new Error('write_mode_unsupported');
        }
        const at = raw.at ?? raw.index;
        if (at == null || !relStr) {
          throw new Error('invalid_parameters');
        }
        current = insertAtPath(
          current as Record<string, unknown>,
          relStr,
          Number(at),
          raw.value,
          { copyRoot: true },
        );
        methods.push('insert_at');
        applied += 1;
      } else {
        return fail(
          current,
          'invalid_parameters',
          `op not ported to TS yet: ${resolved}`,
          methods,
          applied,
          skipped,
        );
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const code = msg.includes(':') ? msg.split(':')[0] : msg;
      if (shouldSkipOnMiss(missMode, code)) {
        skipped += 1;
        continue;
      }
      return fail(current, code, msg, methods, applied, skipped);
    }
  }

  return { ok: true, value: current, methods, applied, skipped };
}
