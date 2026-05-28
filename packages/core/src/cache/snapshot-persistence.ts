/**
 * Phase 4 (optional): persistence hooks for snapshots.
 *
 * **Policy:** Do not persist PII or large blobs without an explicit allowlist and size cap.
 * Prefer keeping the repository memory-only; React Query + HTTP cache handle refetch.
 *
 * This module documents the contract; wire `CacheManager` in app code when needed.
 */

import type { CacheManager } from '../utils/CacheManager';
import type { SnapshotEnvelope } from './entity-snapshot-repository';

export interface SnapshotPersistencePolicy {
  /** Max serialized JSON length (UTF-16 approx) per key. */
  maxJsonChars?: number;
  /** Return true only for non-sensitive snapshot keys. */
  allowKey?: (key: string) => boolean;
}

const DEFAULT_MAX_CHARS = 512_000;

/**
 * Store a snapshot in `CacheManager` if the key passes policy and serialized size cap.
 * Data is stored as structured `SnapshotEnvelope` in the cache entry (storage may JSON it).
 */
export async function persistSnapshotEnvelope(
  manager: CacheManager,
  key: string,
  envelope: SnapshotEnvelope,
  policy?: SnapshotPersistencePolicy
): Promise<boolean> {
  const allow = policy?.allowKey ?? (() => false);
  if (!allow(key)) return false;
  const max = policy?.maxJsonChars ?? DEFAULT_MAX_CHARS;
  let json: string;
  try {
    json = JSON.stringify(envelope);
  } catch {
    return false;
  }
  if (json.length > max) return false;
  try {
    await manager.set(`snapshot:${key}`, envelope);
    return true;
  } catch {
    return false;
  }
}

/**
 * Read a previously persisted envelope (same key namespace as `persistSnapshotEnvelope`).
 */
export async function loadPersistedSnapshotEnvelope(
  manager: CacheManager,
  key: string
): Promise<SnapshotEnvelope | undefined> {
  const raw = await manager.get<SnapshotEnvelope>(`snapshot:${key}`);
  return raw ?? undefined;
}
