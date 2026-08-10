/**
 * Classify API paths that require ecosystem (pid=1) bearer on shell routes.
 * Genetic: core.auth.session_cache_contour.gen1
 */

const ECOSYSTEM_API_PREFIXES = [
  '/api/profile/',
  '/api/finance/me',
  '/api/payments',
  '/api/wallets',
  /** Permanent/temp file manager — dashboard always uses ecosystem pid (vault[1]). */
  '/api/storage',
] as const;

function normalizeApiPath(urlOrPath: string): string {
  const raw = String(urlOrPath || '');
  if (!raw) return '';
  try {
    if (raw.startsWith('http://') || raw.startsWith('https://')) {
      return new URL(raw).pathname;
    }
  } catch {
    /* fall through */
  }
  return raw.split('?')[0] || '';
}

/** True when the request targets personal/ecosystem treasury (not hosted storefront). */
export function isEcosystemScopedApiPath(urlOrPath: string): boolean {
  const path = normalizeApiPath(urlOrPath);
  if (!path.startsWith('/api/')) return false;
  return ECOSYSTEM_API_PREFIXES.some((prefix) => path.startsWith(prefix));
}

export type RouteScopeKind = 'ecosystem' | 'hosted' | 'workspace';

export function classifyRouteScope(
  urlOrPath: string,
  pathname?: string | null,
): RouteScopeKind | null {
  if (pathname) {
    const hosted = /^\/s\/(\d+)(?:\/|$)/i.exec(pathname);
    if (hosted) return 'hosted';
  }
  if (isEcosystemScopedApiPath(urlOrPath)) return 'ecosystem';
  return 'workspace';
}
