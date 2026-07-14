import { DataCache } from '../utils/DataCache';
import {
  buildFlatPathMap,
  getValueAtPath,
  type BuildFlatPathMapOptions,
} from './data-paths';

export interface SnapshotMeta {
  /** API etag, version, or response timestamp string — for path-index coherence */
  revision?: string | number;
  fetchedAt: number;
  source?: string;
}

export interface SnapshotEnvelope<T = unknown> {
  data: T;
  meta: SnapshotMeta;
}

export type MergeStrategy = 'replace' | 'shallowMerge' | 'deepMerge';

export interface EntitySnapshotRepositoryOptions {
  /** Max stored snapshots (LRU via underlying DataCache). */
  maxSnapshots?: number;
  /** TTL ms for entries; use a large value when React Query owns freshness. */
  ttlMs?: number;
  /** Default max depth for deepMerge. */
  defaultMergeMaxDepth?: number;
  /** Bounds for optional path index build. */
  pathIndexMaxDepth?: number;
  pathIndexMaxKeys?: number;
}

type PathIndexEntry = {
  revision: string | number | undefined;
  paths: Record<string, unknown>;
};

function revisionKey(rev: string | number | undefined): string {
  if (rev === undefined) return '';
  return String(rev);
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

function deepMergeRecords(
  target: Record<string, unknown>,
  source: Record<string, unknown>,
  maxDepth: number,
  depth: number
): Record<string, unknown> {
  if (depth >= maxDepth) {
    return { ...target, ...source };
  }
  const out: Record<string, unknown> = { ...target };
  for (const k of Object.keys(source)) {
    const sv = source[k];
    const tv = target[k];
    if (isPlainObject(sv) && isPlainObject(tv)) {
      out[k] = deepMergeRecords(tv, sv, maxDepth, depth + 1);
    } else {
      out[k] = sv;
    }
  }
  return out;
}

/**
 * In-memory snapshot repository: entity/blob JSON with dotted-path read,
 * merge strategies, prefix invalidation, optional path index per revision.
 */
export class EntitySnapshotRepository {
  private readonly cache: DataCache<SnapshotEnvelope>;
  private readonly pathIndexCache = new Map<string, PathIndexEntry>();
  private readonly listeners = new Map<string, Set<() => void>>();
  private readonly defaultMergeMaxDepth: number;
  private readonly pathIndexBuildOptions: BuildFlatPathMapOptions;

  constructor(options: EntitySnapshotRepositoryOptions = {}) {
    this.cache = new DataCache<SnapshotEnvelope>({
      maxSize: options.maxSnapshots ?? 200,
      ttl: options.ttlMs ?? 86_400_000,
    });
    this.defaultMergeMaxDepth = options.defaultMergeMaxDepth ?? 12;
    this.pathIndexBuildOptions = {
      maxDepth: options.pathIndexMaxDepth,
      maxKeys: options.pathIndexMaxKeys,
    };
  }

  setSnapshot<T>(key: string, data: T, meta: SnapshotMeta): void {
    this.cache.set(key, { data, meta });
    this.pathIndexCache.delete(key);
    this.notify(key);
  }

  getSnapshot<T = unknown>(key: string): SnapshotEnvelope<T> | undefined {
    const v = this.cache.get(key);
    return v === null ? undefined : (v as SnapshotEnvelope<T>);
  }

  has(key: string): boolean {
    return this.cache.has(key);
  }

  /**
   * True when a snapshot exists and `meta.fetchedAt` is within `maxAgeMs`.
   * Mirrors freshness checks used by {@link AgentProtocol.readThroughSnapshot}.
   */
  isFresh(key: string, maxAgeMs: number): boolean {
    const snap = this.getSnapshot(key);
    if (!snap) return false;
    return Date.now() - snap.meta.fetchedAt <= maxAgeMs;
  }

  /** All snapshot keys (for AgentProtocol search / introspection). */
  listSnapshotKeys(): string[] {
    return this.cache.keys();
  }

  /**
   * Read a value by dotted path; walks live data unless a path index exists for current revision.
   */
  getAtPath(key: string, dottedPath: string): unknown {
    const snap = this.cache.get(key);
    if (snap === null) return undefined;
    const idx = this.pathIndexCache.get(key);
    const rev = snap.meta.revision;
    if (idx && revisionKey(idx.revision) === revisionKey(rev)) {
      if (dottedPath === '' || dottedPath == null) return snap.data;
      if (Object.prototype.hasOwnProperty.call(idx.paths, dottedPath)) {
        return idx.paths[dottedPath];
      }
    }
    return getValueAtPath(snap.data, dottedPath);
  }

  mergeSnapshot(
    key: string,
    partial: unknown,
    strategy: MergeStrategy,
    mergeMaxDepth?: number
  ): SnapshotEnvelope | undefined {
    const existing = this.cache.get(key);
    const depth = mergeMaxDepth ?? this.defaultMergeMaxDepth;
    const now = Date.now();

    if (existing === null) {
      if (partial === undefined) return undefined;
      const env: SnapshotEnvelope = {
        data: partial,
        meta: { fetchedAt: now, source: 'merge:initial' },
      };
      this.cache.set(key, env);
      this.pathIndexCache.delete(key);
      this.notify(key);
      return env;
    }

    let nextData: unknown = existing.data;

    if (strategy === 'replace') {
      nextData = partial;
    } else if (strategy === 'shallowMerge') {
      if (isPlainObject(existing.data) && isPlainObject(partial)) {
        nextData = { ...existing.data, ...partial };
      } else {
        nextData = partial;
      }
    } else if (strategy === 'deepMerge') {
      if (isPlainObject(existing.data) && isPlainObject(partial)) {
        nextData = deepMergeRecords(existing.data, partial, depth, 0);
      } else {
        nextData = partial;
      }
    }

    const env: SnapshotEnvelope = {
      data: nextData,
      meta: {
        ...existing.meta,
        fetchedAt: now,
        source: 'merge',
      },
    };
    this.cache.set(key, env);
    this.pathIndexCache.delete(key);
    this.notify(key);
    return env;
  }

  invalidate(key: string): boolean {
    const removed = this.cache.invalidate(key);
    this.pathIndexCache.delete(key);
    if (removed) this.notify(key);
    return removed;
  }

  /**
   * Remove every snapshot whose key starts with `prefix` (string prefix, not regex).
   */
  invalidatePrefix(prefix: string): number {
    let count = 0;
    for (const k of this.cache.keys()) {
      if (k.startsWith(prefix)) {
        this.invalidate(k);
        count++;
      }
    }
    return count;
  }

  clear(): void {
    for (const k of this.cache.keys()) {
      this.pathIndexCache.delete(k);
    }
    this.cache.clear();
    for (const key of this.listeners.keys()) {
      this.notify(key);
    }
  }

  /**
   * Build or return cached flat path map for the current snapshot revision.
   */
  getOrBuildPathIndex(key: string): Record<string, unknown> | undefined {
    const snap = this.cache.get(key);
    if (snap === null) return undefined;
    const rev = snap.meta.revision;
    const cached = this.pathIndexCache.get(key);
    if (cached && revisionKey(cached.revision) === revisionKey(rev)) {
      return cached.paths;
    }
    const paths = buildFlatPathMap(snap.data, this.pathIndexBuildOptions);
    this.pathIndexCache.set(key, { revision: rev, paths });
    return paths;
  }

  /**
   * Subscribe to changes for a snapshot key (set, merge, invalidate, clear).
   */
  subscribe(key: string, listener: () => void): () => void {
    let set = this.listeners.get(key);
    if (!set) {
      set = new Set();
      this.listeners.set(key, set);
    }
    set.add(listener);
    return () => {
      const s = this.listeners.get(key);
      if (!s) return;
      s.delete(listener);
      if (s.size === 0) this.listeners.delete(key);
    };
  }

  private notify(key: string): void {
    const set = this.listeners.get(key);
    if (!set) return;
    for (const fn of set) {
      try {
        fn();
      } catch {
        /* ignore subscriber errors */
      }
    }
  }
}

export function createEntitySnapshotRepository(
  options?: EntitySnapshotRepositoryOptions
): EntitySnapshotRepository {
  return new EntitySnapshotRepository(options);
}
