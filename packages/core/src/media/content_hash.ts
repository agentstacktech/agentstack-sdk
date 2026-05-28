/**
 * Browser-side content hash (SHA-256) until BLAKE3 WASM lands (ADR E.1).
 * Prefer incremental hashing for large files.
 */
export async function contentHashBytes(data: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', data);
  return bufferToHex(digest);
}

function bufferToHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
