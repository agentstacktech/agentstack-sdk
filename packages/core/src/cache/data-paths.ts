/**
 * Dotted-path access and flat path helpers for JSON snapshots (shared with frontend).
 */

export function getValueAtPath(obj: unknown, dotted: string): unknown {
  if (dotted == null || dotted === '') return obj;
  const keys = dotted.split('.').filter((k) => k.length > 0);
  let cur: unknown = obj;
  for (const k of keys) {
    if (cur == null || typeof cur !== 'object') return undefined;
    cur = (cur as Record<string, unknown>)[k];
  }
  return cur;
}

export type FlatRow = {
  path: string;
  type: string;
  preview: string;
  depth: number;
};

export const FLATTEN_PROJECT_DATA_MAX_ROWS = 8000;
export const FLATTEN_PROJECT_DATA_MAX_DEPTH = 14;

/**
 * Depth-first flatten for explorers and path-index building.
 * Caps rows and depth to bound work (organism / bounded work).
 */
export function flattenProjectData(
  obj: unknown,
  options?: { maxRows?: number; maxDepth?: number }
): FlatRow[] {
  const maxRows = options?.maxRows ?? FLATTEN_PROJECT_DATA_MAX_ROWS;
  const maxDepth = options?.maxDepth ?? FLATTEN_PROJECT_DATA_MAX_DEPTH;
  const rows: FlatRow[] = [];

  function previewScalar(v: unknown): string {
    if (v === null) return 'null';
    if (v === undefined) return 'undefined';
    if (typeof v === 'string') {
      return v.length > 100 ? `${v.slice(0, 100)}…` : v;
    }
    try {
      const s = JSON.stringify(v);
      return s.length > 120 ? `${s.slice(0, 120)}…` : s;
    } catch {
      return String(v);
    }
  }

  function walk(v: unknown, path: string, depth: number): void {
    if (rows.length >= maxRows) return;
    if (depth > maxDepth) {
      rows.push({ path, type: 'nested', preview: '…', depth });
      return;
    }
    if (v === null || v === undefined) {
      rows.push({ path, type: 'null', preview: 'null', depth });
      return;
    }
    if (Array.isArray(v)) {
      rows.push({ path, type: 'array', preview: `[${v.length}]`, depth });
      const cap = Math.min(v.length, 50);
      for (let i = 0; i < cap; i++) {
        walk(v[i], path ? `${path}.${i}` : String(i), depth + 1);
      }
      if (v.length > cap) {
        rows.push({
          path: `${path || 'root'}.…`,
          type: 'truncated',
          preview: `+${v.length - cap} more`,
          depth: depth + 1,
        });
      }
      return;
    }
    if (typeof v === 'object') {
      const o = v as Record<string, unknown>;
      const keys = Object.keys(o);
      const label = path || '(root)';
      rows.push({
        path: label,
        type: 'object',
        preview: keys.length === 0 ? '{}' : `{${keys.length} keys}`,
        depth,
      });
      if (keys.length === 0) return;
      for (const k of keys) {
        const next = path ? `${path}.${k}` : k;
        walk(o[k], next, depth + 1);
      }
      return;
    }
    rows.push({
      path,
      type: typeof v,
      preview: previewScalar(v),
      depth,
    });
  }

  walk(obj, '', 0);
  return rows;
}

export type FlatDataPathSuggestion = {
  path: string;
  valuePreview: string;
};

/**
 * Unique dotted paths from a JSON tree for autocomplete (scalar previews as hint text).
 */
export function buildFlatDataPathSuggestions(
  data: unknown,
  options?: { max?: number }
): FlatDataPathSuggestion[] {
  const rows = flattenProjectData(data);
  const map = new Map<string, FlatDataPathSuggestion>();
  for (const r of rows) {
    if (r.type === 'truncated') continue;
    if (r.path === '' && r.type === 'object') continue;
    const path = r.path;
    if (path === '') continue;
    map.set(path, { path, valuePreview: r.preview });
  }
  const out = [...map.values()].sort((a, b) => a.path.localeCompare(b.path));
  const max = options?.max;
  if (max != null && max > 0 && out.length > max) return out.slice(0, max);
  return out;
}

export interface BuildFlatPathMapOptions {
  maxDepth?: number;
  maxKeys?: number;
}

/**
 * Map dotted path → value at that path (for fast `getAtPath` when revision matches).
 */
export function buildFlatPathMap(
  obj: unknown,
  options?: BuildFlatPathMapOptions
): Record<string, unknown> {
  const maxDepth = options?.maxDepth ?? FLATTEN_PROJECT_DATA_MAX_DEPTH;
  const maxKeys = options?.maxKeys ?? 50_000;
  const out: Record<string, unknown> = {};
  let count = 0;

  function walk(v: unknown, path: string, depth: number): void {
    if (count >= maxKeys) return;
    if (depth > maxDepth) return;

    if (v === null || v === undefined) {
      if (path) {
        out[path] = v as unknown;
        count++;
      }
      return;
    }
    if (Array.isArray(v)) {
      if (path) {
        out[path] = v;
        count++;
      }
      const cap = Math.min(v.length, 50);
      for (let i = 0; i < cap; i++) {
        walk(v[i], path ? `${path}.${i}` : String(i), depth + 1);
      }
      return;
    }
    if (typeof v === 'object') {
      const o = v as Record<string, unknown>;
      if (path && Object.keys(o).length === 0) {
        out[path] = v;
        count++;
      }
      for (const k of Object.keys(o)) {
        const next = path ? `${path}.${k}` : k;
        walk(o[k], next, depth + 1);
      }
      return;
    }
    if (path) {
      out[path] = v;
      count++;
    }
  }

  walk(obj, '', 0);
  return out;
}
