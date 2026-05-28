/**
 * DataCache - Universal caching utility with TTL and LRU eviction
 * 
 * @example
 * ```typescript
 * const cache = new DataCache<User[]>({ ttl: 300000 }); // 5 min TTL
 * 
 * // Set data
 * cache.set('users:project:1', users);
 * 
 * // Get data (returns null if expired or not found)
 * const cachedUsers = cache.get('users:project:1');
 * 
 * // Invalidate
 * cache.invalidate('users:project:1');
 * 
 * // Clear all
 * cache.clear();
 * ```
 */

export interface CacheOptions {
  ttl?: number; // Time to live in ms, default 300000 (5 min)
  maxSize?: number; // Max number of entries, default 100
  onEvict?: (key: string, value: any) => void; // Callback when entry is evicted
}

export interface CacheEntry<T> {
  value: T;
  timestamp: number;
  accessCount: number;
  lastAccess: number;
}

export class DataCache<T = any> {
  private cache: Map<string, CacheEntry<T>>;
  private ttl: number;
  private maxSize: number;
  private onEvict?: (key: string, value: T) => void;

  constructor(options: CacheOptions = {}) {
    this.cache = new Map();
    this.ttl = options.ttl || 300000; // 5 minutes default
    this.maxSize = options.maxSize || 100;
    this.onEvict = options.onEvict;
  }

  /**
   * Get value from cache (returns null if expired or not found)
   */
  get(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    // Check if expired
    const now = Date.now();
    if (now - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      if (this.onEvict) {
        this.onEvict(key, entry.value);
      }
      return null;
    }

    // Update access info
    entry.accessCount++;
    entry.lastAccess = now;

    return entry.value;
  }

  /**
   * Set value in cache
   */
  set(key: string, value: T): void {
    const now = Date.now();

    // Evict LRU if at max size
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictLRU();
    }

    this.cache.set(key, {
      value,
      timestamp: now,
      accessCount: 0,
      lastAccess: now
    });
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Invalidate (delete) a cache entry
   */
  invalidate(key: string): boolean {
    const entry = this.cache.get(key);
    if (entry && this.onEvict) {
      this.onEvict(key, entry.value);
    }
    return this.cache.delete(key);
  }

  /**
   * Invalidate all entries matching a pattern
   */
  invalidatePattern(pattern: string | RegExp): number {
    const regex = typeof pattern === 'string' 
      ? new RegExp(pattern) 
      : pattern;
    
    let count = 0;
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.invalidate(key);
        count++;
      }
    }
    return count;
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    if (this.onEvict) {
      for (const [key, entry] of this.cache.entries()) {
        this.onEvict(key, entry.value);
      }
    }
    this.cache.clear();
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Get cache keys
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Get cache statistics
   */
  stats(): {
    size: number;
    maxSize: number;
    ttl: number;
    oldestEntry: number | null;
    newestEntry: number | null;
    totalAccessCount: number;
  } {
    const entries = Array.from(this.cache.values());
    const timestamps = entries.map(e => e.timestamp);
    const totalAccessCount = entries.reduce((sum, e) => sum + e.accessCount, 0);

    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      ttl: this.ttl,
      oldestEntry: timestamps.length > 0 ? Math.min(...timestamps) : null,
      newestEntry: timestamps.length > 0 ? Math.max(...timestamps) : null,
      totalAccessCount
    };
  }

  /**
   * Evict least recently used entry
   */
  private evictLRU(): void {
    let lruKey: string | null = null;
    let lruTime = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccess < lruTime) {
        lruTime = entry.lastAccess;
        lruKey = key;
      }
    }

    if (lruKey) {
      this.invalidate(lruKey);
    }
  }

  /**
   * Clean up expired entries
   */
  cleanup(): number {
    const now = Date.now();
    let count = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.ttl) {
        this.invalidate(key);
        count++;
      }
    }

    return count;
  }
}

// Global cache instances for common use cases
export const rolesCache = new DataCache({ ttl: 300000, maxSize: 50 }); // 5 min
export const permissionsCache = new DataCache({ ttl: 600000, maxSize: 20 }); // 10 min
export const projectsCache = new DataCache({ ttl: 180000, maxSize: 100 }); // 3 min
export const usersCache = new DataCache({ ttl: 120000, maxSize: 200 }); // 2 min

export default DataCache;




