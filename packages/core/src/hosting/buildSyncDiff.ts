/**
 * Client-side diff helper for hosting.sync.plan manifests (rsync-style fast path).
 * Genetic tag: sdk.hosting.gen2 · core.hosting.bucket.gen1
 */

export type ServerManifestRow = {
  path: string;
  bytes: number;
  sha256?: string | null;
  stat_fingerprint?: string | null;
};

export type LocalManifestRow = {
  bytes: number;
  sha256?: string;
  statFingerprint?: string;
};

export type SyncDiffResult = {
  upload: string[];
  skip: string[];
};

/** Paths that need upload (missing locally, size mismatch, or hash/fingerprint mismatch). */
export function buildSyncDiff(
  local: ReadonlyMap<string, LocalManifestRow>,
  server: readonly ServerManifestRow[],
): SyncDiffResult {
  const upload: string[] = [];
  const skip: string[] = [];
  for (const row of server) {
    const path = String(row.path || '').trim();
    if (!path) continue;
    const loc = local.get(path);
    if (!loc) {
      upload.push(path);
      continue;
    }
    if (loc.bytes !== row.bytes) {
      upload.push(path);
      continue;
    }
    const serverSha = row.sha256 ? String(row.sha256) : '';
    const localSha = loc.sha256 ? String(loc.sha256) : '';
    if (serverSha && localSha && localSha === serverSha) {
      skip.push(path);
      continue;
    }
    const serverFp = row.stat_fingerprint ? String(row.stat_fingerprint) : '';
    const localFp = loc.statFingerprint ? String(loc.statFingerprint) : '';
    if (serverFp && localFp && localFp === serverFp) {
      skip.push(path);
      continue;
    }
    if (!serverSha && !serverFp && loc.bytes === row.bytes) {
      skip.push(path);
      continue;
    }
    upload.push(path);
  }
  return { upload, skip };
}
