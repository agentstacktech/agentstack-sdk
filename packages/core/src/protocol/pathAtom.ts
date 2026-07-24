/**
 * PathAtom grammar helpers (mirror of shared/atoms/path_atom.py).
 * Genetic tag: shared.atoms.path.gen1 / repo.platform.sdk.agent_protocol.gen1
 */

export type PathSegKind = 'key' | 'index' | 'uid';

export interface PathSegment {
  kind: PathSegKind;
  value: string | number;
  containerKey?: string;
}

const DENIED = new Set(['__proto__', 'prototype', 'constructor']);

/** Parse `a.b`, `items[0]`, `items{uid}` / `items[@uid=x]`. */
export function parsePath(path: string): PathSegment[] {
  const raw = (path || '').trim();
  if (!raw || raw.length > 512) throw new Error('invalid_path');
  const parts: string[] = [];
  let cur = '';
  let depthSq = 0;
  let depthBrace = 0;
  for (const ch of raw) {
    if (ch === '[') {
      depthSq++;
      cur += ch;
    } else if (ch === ']') {
      depthSq = Math.max(0, depthSq - 1);
      cur += ch;
    } else if (ch === '{') {
      depthBrace++;
      cur += ch;
    } else if (ch === '}') {
      depthBrace = Math.max(0, depthBrace - 1);
      cur += ch;
    } else if (ch === '.' && depthSq === 0 && depthBrace === 0) {
      if (cur) parts.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  if (cur) parts.push(cur);
  if (!parts.length || parts.length > 64) throw new Error('invalid_path');

  return parts.map((part) => {
    let m = part.match(/^(.+)\{([^}]+)\}$/) || part.match(/^(.+)\[@uid=([^\]]+)\]$/);
    if (m) {
      if (DENIED.has(m[1])) throw new Error('invalid_path_segment');
      return { kind: 'uid' as const, value: m[2], containerKey: m[1] };
    }
    m = part.match(/^(.+)\[(\d+)\]$/);
    if (m) {
      if (DENIED.has(m[1])) throw new Error('invalid_path_segment');
      return { kind: 'index' as const, value: Number(m[2]), containerKey: m[1] };
    }
    if (DENIED.has(part)) throw new Error('invalid_path_segment');
    return { kind: 'key' as const, value: part };
  });
}

function entityKey(item: unknown): string | null {
  if (!item || typeof item !== 'object') return null;
  const o = item as Record<string, unknown>;
  for (const k of ['uid', 'id', 'key']) {
    if (o[k] != null && o[k] !== '') return String(o[k]);
  }
  return null;
}

function resolveUid(node: unknown, uid: string): unknown {
  if (Array.isArray(node)) {
    return node.find((i) => entityKey(i) === uid);
  }
  if (node && typeof node === 'object') {
    const o = node as Record<string, unknown>;
    if (uid in o) return o[uid];
    for (const v of Object.values(o)) {
      if (entityKey(v) === uid) return v;
    }
  }
  return undefined;
}

/** Get value at PathAtom path; flat protein short-circuit when path in root. */
export function getPath(root: unknown, path: string): unknown {
  if (root == null || !path) return undefined;
  if (typeof root === 'object' && !Array.isArray(root) && path in (root as object)) {
    return (root as Record<string, unknown>)[path];
  }
  let segs: PathSegment[];
  try {
    segs = parsePath(path);
  } catch {
    return undefined;
  }
  let current: unknown = root;
  for (const seg of segs) {
    if (current == null) return undefined;
    if (seg.kind === 'key') {
      if (typeof current !== 'object' || Array.isArray(current)) return undefined;
      current = (current as Record<string, unknown>)[String(seg.value)];
    } else if (seg.kind === 'index') {
      const key = seg.containerKey!;
      if (typeof current !== 'object' || Array.isArray(current)) return undefined;
      const lst = (current as Record<string, unknown>)[key];
      if (!Array.isArray(lst)) return undefined;
      current = lst[Number(seg.value)];
    } else {
      const key = seg.containerKey!;
      if (typeof current !== 'object' || Array.isArray(current)) return undefined;
      current = resolveUid((current as Record<string, unknown>)[key], String(seg.value));
    }
  }
  return current;
}

/** Structured GET: subset by paths (flat map). */
export function projectPaths(root: unknown, paths: string[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const p of paths) out[p] = getPath(root, p);
  return out;
}

function ensureListPad(lst: unknown[], index: number, fill: unknown): void {
  while (lst.length <= index) lst.push(structuredCloneSafe(fill));
}

function structuredCloneSafe<T>(v: T): T {
  if (v == null || typeof v !== 'object') return v;
  try {
    return structuredClone(v);
  } catch {
    return JSON.parse(JSON.stringify(v)) as T;
  }
}

/**
 * Set value at PathAtom path (mirror of ``shared.atoms.path_atom.set_path``).
 * Returns updated root (deep-copied levels when ``copyRoot``).
 */
export function setPath(
  root: Record<string, unknown> | null | undefined,
  path: string,
  value: unknown,
  opts?: { copyRoot?: boolean; listKey?: string },
): Record<string, unknown> {
  const copyRoot = opts?.copyRoot !== false;
  const listKey = opts?.listKey ?? 'uid';
  const result: Record<string, unknown> = copyRoot
    ? structuredCloneSafe(root && typeof root === 'object' ? root : {})
    : ((root && typeof root === 'object' ? root : {}) as Record<string, unknown>);
  const segments = parsePath(path);
  if (!segments.length) return result;

  let current: Record<string, unknown> | unknown[] = result;
  for (let i = 0; i < segments.length - 1; i++) {
    const seg = segments[i]!;
    if (seg.kind === 'key') {
      const key = String(seg.value);
      const cur = current as Record<string, unknown>;
      if (cur[key] == null || typeof cur[key] !== 'object' || Array.isArray(cur[key])) {
        cur[key] = {};
      }
      current = cur[key] as Record<string, unknown>;
    } else if (seg.kind === 'index') {
      const key = seg.containerKey!;
      const cur = current as Record<string, unknown>;
      if (!Array.isArray(cur[key])) cur[key] = [];
      const lst = cur[key] as unknown[];
      const idx = Number(seg.value);
      ensureListPad(lst, idx, {});
      if (lst[idx] == null || typeof lst[idx] !== 'object') lst[idx] = {};
      current = lst[idx] as Record<string, unknown>;
    } else {
      const key = seg.containerKey!;
      const uid = String(seg.value);
      const cur = current as Record<string, unknown>;
      if (cur[key] == null) cur[key] = [];
      const node = cur[key];
      if (node && typeof node === 'object' && !Array.isArray(node)) {
        const map = node as Record<string, unknown>;
        if (map[uid] == null || typeof map[uid] !== 'object') {
          map[uid] = { [listKey]: uid };
        }
        current = map[uid] as Record<string, unknown>;
      } else {
        const lst = Array.isArray(node) ? node : [];
        cur[key] = lst;
        let found = lst.find(
          (item) => item && typeof item === 'object' && entityKey(item) === uid,
        ) as Record<string, unknown> | undefined;
        if (!found) {
          found = { [listKey]: uid };
          lst.push(found);
        }
        current = found;
      }
    }
  }

  const final = segments[segments.length - 1]!;
  if (final.kind === 'key') {
    (current as Record<string, unknown>)[String(final.value)] = value;
  } else if (final.kind === 'index') {
    const key = final.containerKey!;
    const cur = current as Record<string, unknown>;
    if (!Array.isArray(cur[key])) cur[key] = [];
    const lst = cur[key] as unknown[];
    const idx = Number(final.value);
    ensureListPad(lst, idx, null);
    lst[idx] = value;
  } else {
    const key = final.containerKey!;
    const uid = String(final.value);
    let payload = value;
    if (payload && typeof payload === 'object' && !Array.isArray(payload) && !(listKey in (payload as object))) {
      payload = { ...(payload as Record<string, unknown>), [listKey]: uid };
    }
    const cur = current as Record<string, unknown>;
    if (cur[key] == null) cur[key] = [];
    const node = cur[key];
    if (node && typeof node === 'object' && !Array.isArray(node)) {
      (node as Record<string, unknown>)[uid] = payload;
    } else {
      const lst = Array.isArray(node) ? node : [];
      cur[key] = lst;
      const ix = lst.findIndex(
        (item) => item && typeof item === 'object' && entityKey(item) === uid,
      );
      if (ix >= 0) lst[ix] = payload;
      else lst.push(payload);
    }
  }
  return result;
}
