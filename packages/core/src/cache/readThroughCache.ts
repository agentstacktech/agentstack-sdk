import { DataCache } from '../utils/DataCache';

export interface ReadThroughCacheOptions {
  /** Max normalized entities (LRU via underlying DataCache). */
  maxEntities?: number;
  /** TTL ms; use a large value when React Query owns freshness. */
  ttlMs?: number;
}

export type EntityLoader<T> = () => Promise<T | null | undefined>;

/**
 * Simple normalized entity store: keyed by `entityType:id` (or any string key).
 *
 * Lighter than {@link EntitySnapshotRepository} — no envelope meta, path index, or merge.
 * Pair with `sdk.protocol.readThroughSnapshot` when you need revision + dotted paths.
 */
export class ReadThroughCache<T = unknown> {
  private readonly cache: DataCache<T>;

  constructor(options: ReadThroughCacheOptions = {}) {
    this.cache = new DataCache<T>({
      maxSize: options.maxEntities ?? 500,
      ttl: options.ttlMs ?? 300_000,
    });
  }

  /** Read a cached entity; `undefined` when missing or expired. */
  get(key: string): T | undefined {
    const v = this.cache.get(key);
    return v === null ? undefined : v;
  }

  /** Cache hit → return; else `loader()`, store on truthy result, return. */
  async getOrLoad(key: string, loader: EntityLoader<T>): Promise<T | undefined> {
    const hit = this.get(key);
    if (hit !== undefined) return hit;
    const loaded = await loader();
    if (loaded === null || loaded === undefined) return undefined;
    this.set(key, loaded);
    return loaded;
  }

  set(key: string, entity: T): void {
    this.cache.set(key, entity);
  }

  has(key: string): boolean {
    return this.cache.has(key);
  }

  invalidate(key: string): boolean {
    return this.cache.invalidate(key);
  }

  /** Remove every entity whose key starts with `prefix`. */
  invalidatePrefix(prefix: string): number {
    let count = 0;
    for (const k of this.cache.keys()) {
      if (k.startsWith(prefix)) {
        if (this.invalidate(k)) count++;
      }
    }
    return count;
  }

  clear(): void {
    this.cache.clear();
  }

  keys(): string[] {
    return this.cache.keys();
  }
}

/** Build a normalized entity key: `type:id` (both segments trimmed). */
export function entityCacheKey(entityType: string, entityId: string | number): string {
  return `${String(entityType).trim()}:${String(entityId).trim()}`;
}

export function createReadThroughCache<T>(
  options?: ReadThroughCacheOptions
): ReadThroughCache<T> {
  return new ReadThroughCache<T>(options);
}
