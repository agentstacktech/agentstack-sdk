/**
 * JSON bytes for leaf_digest — mirrors ``shared.atoms.edit_intent.leaf_digest`` (sort_keys, default=str).
 */

function jsonLeafStringify(value: unknown): string {
  if (value === null) return 'null';
  const t = typeof value;
  if (t === 'string') return JSON.stringify(value);
  if (t === 'boolean') return value ? 'true' : 'false';
  if (t === 'number') {
    if (!Number.isFinite(value as number)) return JSON.stringify(String(value));
    return String(value);
  }
  if (t === 'bigint') return JSON.stringify(String(value));
  if (Array.isArray(value)) {
    return '[' + value.map((item) => jsonLeafStringify(item)).join(', ') + ']';
  }
  if (t === 'object') {
    const keys = Object.keys(value as object).sort();
    const parts = keys.map(
      (k) => `${JSON.stringify(k)}: ${jsonLeafStringify((value as Record<string, unknown>)[k])}`,
    );
    return '{' + parts.join(', ') + '}';
  }
  return JSON.stringify(String(value));
}

/** UTF-8 payload hashed by leaf_digest (str → raw utf-8, else canonical JSON). */
export function leafDigestPayloadBytes(value: unknown): Uint8Array {
  const enc = new TextEncoder();
  if (typeof value === 'string') return enc.encode(value);
  return enc.encode(jsonLeafStringify(value));
}
