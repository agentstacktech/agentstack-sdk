/**
 * Parse revision from HTTP ETag header (CRM optimistic concurrency).
 * Genetic: ``sdk.crm.gen1``
 */

export function parseCrmEtagRev(headers: Record<string, string> | undefined): number | undefined {
  if (!headers) return undefined;
  const raw = headers.etag ?? headers.ETag;
  if (!raw) return undefined;
  const match = String(raw).match(/"?(\d+)"?/);
  if (!match) return undefined;
  const rev = Number(match[1]);
  return Number.isFinite(rev) ? rev : undefined;
}
