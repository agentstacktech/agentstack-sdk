/**
 * Stable tus-lite op ids for hosting ZIP resumable uploads (GA-16 / ZIP-03).
 * Genetic tag: sdk.media.gen1
 */

export function fingerprintHostingZipFile(
  file: Pick<File, 'name' | 'size' | 'lastModified'>,
): string {
  const seed = `${file.name}|${file.size}|${file.lastModified}`;
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

/** Server-safe op id (max 64 chars, tus charset). */
export function buildHostingZipOpId(
  projectId: number,
  bucketId: string,
  file: Pick<File, 'name' | 'size' | 'lastModified'>,
): string {
  const bucketPart = bucketId.replace(/[^A-Za-z0-9-_]/g, '').slice(0, 24) || 'bucket';
  const fp = fingerprintHostingZipFile(file);
  return `hz-${projectId}-${bucketPart}-${fp}`.slice(0, 64);
}
