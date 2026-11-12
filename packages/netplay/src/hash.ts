/**
 * Deterministic state hashing for desync detection. FNV-1a over a canonical walk:
 * object keys sorted, typed arrays by element, Map/Set by insertion order, undefined skipped.
 */
const FNV_OFFSET = 0x811c9dc5;

function mixByte(h: number, b: number): number {
  return Math.imul(h ^ (b & 0xff), 0x01000193) >>> 0;
}
function mixU32(h: number, x: number): number {
  h = mixByte(h, x);
  h = mixByte(h, x >>> 8);
  h = mixByte(h, x >>> 16);
  return mixByte(h, x >>> 24);
}
function mixStr(h: number, s: string): number {
  h = mixU32(h, s.length);
  for (let i = 0; i < s.length; i++) h = mixU32(h, s.charCodeAt(i));
  return h;
}
const f64 = new Float64Array(1);
const f64u = new Uint32Array(f64.buffer);
function mixNum(h: number, n: number): number {
  if (Number.isInteger(n) && Math.abs(n) <= 0x7fffffff) return mixU32(mixByte(h, 1), n >>> 0);
  f64[0] = n;
  return mixU32(mixU32(mixByte(h, 2), f64u[0]!), f64u[1]!);
}

function walk(h: number, v: unknown, seen: Set<object>): number {
  if (v === null) return mixByte(h, 3);
  switch (typeof v) {
    case 'undefined': return mixByte(h, 4);
    case 'boolean': return mixByte(h, v ? 5 : 6);
    case 'number': return mixNum(h, v);
    case 'string': return mixStr(mixByte(h, 7), v);
    case 'bigint': return mixStr(mixByte(h, 8), v.toString());
    case 'function': case 'symbol': return h;
  }
  const o = v as object;
  if (seen.has(o)) throw new TypeError('hashState: cyclic state is not supported');
  seen.add(o);
  if (ArrayBuffer.isView(o) && !(o instanceof DataView)) {
    const arr = o as unknown as ArrayLike<number>;
    h = mixU32(mixByte(h, 9), arr.length);
    for (let i = 0; i < arr.length; i++) h = mixNum(h, arr[i]!);
  } else if (Array.isArray(o)) {
    h = mixU32(mixByte(h, 10), o.length);
    for (const x of o) h = walk(h, x, seen);
  } else if (o instanceof Map) {
    h = mixU32(mixByte(h, 11), o.size);
    for (const [k, x] of o) h = walk(walk(h, k, seen), x, seen);
  } else if (o instanceof Set) {
    h = mixU32(mixByte(h, 12), o.size);
    for (const x of o) h = walk(h, x, seen);
  } else {
    const keys = Object.keys(o).filter((k) => (o as Record<string, unknown>)[k] !== undefined).sort();
    h = mixU32(mixByte(h, 13), keys.length);
    for (const k of keys) h = walk(mixStr(h, k), (o as Record<string, unknown>)[k], seen);
  }
  seen.delete(o);
  return h;
}

/** Hash any plain state (objects, arrays, typed arrays, Map, Set). Returns uint32. */
export function hashState(value: unknown): number {
  return walk(FNV_OFFSET, value, new Set());
}

/** Hash a string (commit–reveal). */
export function hashString(s: string): number {
  return mixStr(FNV_OFFSET, s);
}

/** Canonical JSON (sorted keys) — stable input for commits and signatures. */
export function canonicalJson(v: unknown): string {
  if (v === null || typeof v !== 'object') return JSON.stringify(v) ?? 'null';
  if (Array.isArray(v)) return '[' + v.map(canonicalJson).join(',') + ']';
  const o = v as Record<string, unknown>;
  return '{' + Object.keys(o).filter((k) => o[k] !== undefined).sort().map((k) => JSON.stringify(k) + ':' + canonicalJson(o[k])).join(',') + '}';
}
