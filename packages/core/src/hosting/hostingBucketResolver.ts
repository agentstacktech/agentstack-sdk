/**
 * Canonical public path segment for a hosting site (bucket_name > slug > fallback).
 * Parity with `shared/atoms/hosting_bucket_resolver.py` — sdk.hosting.gen2.
 */

const RESERVED_ROUTE_NAMES = new Set([
  'api',
  'admin',
  'health',
  '_ix',
  '_routes',
  'routes',
  'static',
  'assets',
  'www',
]);

const BUCKET_NAME_RE = /^[a-z0-9]([a-z0-9-]{0,62}[a-z0-9])?$/;

export function normalizeBucketName(raw: string): string {
  return (raw || '').trim().toLowerCase();
}

export function validateBucketName(name?: string | null): boolean {
  if (!name) return false;
  const s = normalizeBucketName(name);
  if (!s || s.length > 64) return false;
  if (RESERVED_ROUTE_NAMES.has(s)) return false;
  return BUCKET_NAME_RE.test(s);
}

export interface HostingSiteBucketInput {
  bucket_id: string;
  bucket_name?: string | null;
  slug?: string | null;
}

/** Resolve display path segment from DNA (bucket_name > slug > fallback). */
export function effectiveBucketName(site: HostingSiteBucketInput): string {
  if (site.bucket_name && validateBucketName(site.bucket_name)) {
    return normalizeBucketName(site.bucket_name);
  }
  if (site.slug && validateBucketName(site.slug)) {
    return normalizeBucketName(site.slug);
  }
  const bid = (site.bucket_id || '').slice(0, 8).toLowerCase().replace(/_/g, '-');
  const candidate = bid ? `site-${bid}` : newFallbackBucketName();
  if (validateBucketName(candidate)) return candidate;
  return newFallbackBucketName();
}

function newFallbackBucketName(): string {
  const hex = Math.random().toString(16).slice(2, 10).padEnd(8, '0');
  return `site-${hex}`;
}
