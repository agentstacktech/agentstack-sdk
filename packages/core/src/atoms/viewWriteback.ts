/**
 * JSON-view writeback guards (port of shared/atoms/write_mode.py).
 * Gene: shared.atoms.directed_edit.gen1
 */

const BODY_SHRINK_RATIO = 0.35;
const SHRINK_MIN_OLD = 400;

const SKETCH_KEYS = new Set(['t', 'keys', 'more', 'next_key']);
const SKETCH_TYPES = new Set(['object', 'array', 'string', 'number', 'boolean', 'null']);

export function jsonViewSketch(value: unknown): boolean {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const keys = Object.keys(value as Record<string, unknown>);
  if (!keys.every((k) => SKETCH_KEYS.has(k))) return false;
  const row = value as Record<string, unknown>;
  if (!SKETCH_TYPES.has(String(row.t ?? ''))) return false;
  return typeof row.keys === 'object' && row.keys !== null && !Array.isArray(row.keys);
}

function bodyShrinkBlocked(beforeChars: number, afterChars: number, allowShrink: boolean): boolean {
  if (allowShrink || beforeChars < SHRINK_MIN_OLD) return false;
  return afterChars < beforeChars * BODY_SHRINK_RATIO;
}

function envelopeWindowReplaceBlocked(
  beforeChars: number,
  afterChars: number,
  window: number,
  allowShrink: boolean,
): boolean {
  if (allowShrink) return false;
  const cap = window;
  return beforeChars > cap && afterChars === cap;
}

function replaceBodyBlocked(
  beforeChars: number,
  afterChars: number,
  jsonWindow: number,
  allowShrink: boolean,
): boolean {
  return (
    bodyShrinkBlocked(beforeChars, afterChars, allowShrink) ||
    envelopeWindowReplaceBlocked(beforeChars, afterChars, jsonWindow, allowShrink)
  );
}

export function viewWritebackBlocked(
  existing: unknown,
  value: unknown,
  opts: { jsonWindow: number; envelopeWindow: number; allowShrink: boolean },
): boolean {
  if (jsonViewSketch(value) && existing != null && !jsonViewSketch(existing)) {
    return true;
  }
  if (typeof existing === 'string' && typeof value === 'string') {
    return (
      replaceBodyBlocked(existing.length, value.length, opts.jsonWindow, opts.allowShrink) ||
      envelopeWindowReplaceBlocked(
        existing.length,
        value.length,
        opts.envelopeWindow,
        opts.allowShrink,
      )
    );
  }
  return false;
}

export function mergeViewWritebackBlocked(
  existing: Record<string, unknown>,
  patch: Record<string, unknown>,
  opts: { jsonWindow: number; envelopeWindow: number; allowShrink: boolean },
): boolean {
  for (const [key, newVal] of Object.entries(patch)) {
    const oldVal = existing[key];
    if (oldVal && typeof oldVal === 'object' && !Array.isArray(oldVal) && newVal && typeof newVal === 'object' && !Array.isArray(newVal)) {
      if (
        mergeViewWritebackBlocked(
          oldVal as Record<string, unknown>,
          newVal as Record<string, unknown>,
          opts,
        )
      ) {
        return true;
      }
    } else if (viewWritebackBlocked(oldVal, newVal, opts)) {
      return true;
    }
  }
  return false;
}
