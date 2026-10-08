/**
 * Classify API paths that require ecosystem (pid=1) bearer on shell routes.
 * Genetic: core.auth.session_cache_contour.gen1
 *
 * Identity PAT CRUD (`/api/user/api-keys`) is **not** ecosystem treasury:
 * list/create auth by `user_id` with a live workspace JWT (G-A153).
 */

const ECOSYSTEM_API_PREFIXES = [
  '/api/profile/',
  '/api/finance/me',
  '/api/payments',
  '/api/wallets',
  /** Permanent/temp file manager — dashboard always uses ecosystem pid (vault[1]). */
  '/api/storage',
] as const;

const USER_PAT_PATH = '/user/api-keys';

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

/** Platform-operator admin BFF (`/api/admin/*`) — may need vault[1] bearer on workspace routes. */
export function isAdminScopedApiPath(urlOrPath: string): boolean {
  const path = normalizeApiPath(urlOrPath);
  return path.startsWith('/api/admin/');
}

/**
 * Platform operator reads: admin BFF, diagnostics, health.
 * Workspace neural feeds (`/api/neural/events`) follow X-Project-ID.
 * These stay on the ecosystem session even when the workspace header is a tenant.
 */
export function isPlatformOperatorApiPath(urlOrPath: string): boolean {
  const path = normalizeApiPath(urlOrPath);
  return (
    path.startsWith('/api/admin/') ||
    path.startsWith('/api/diagnostics/') ||
    path.startsWith('/api/health/')
  );
}

/** True when the request targets personal/ecosystem treasury (not hosted storefront). */
export function isEcosystemScopedApiPath(urlOrPath: string): boolean {
  const path = normalizeApiPath(urlOrPath);
  if (!path.startsWith('/api/')) return false;
  return ECOSYSTEM_API_PREFIXES.some((prefix) => path.startsWith(prefix));
}

/** User/agent PAT CRUD — identity (`user_id`), not vault[1] treasury. */
export function isIdentityScopedApiPath(urlOrPath: string): boolean {
  const path = normalizeApiPath(urlOrPath);
  const rest = path.startsWith('/api/') ? path.slice(4) : path;
  return rest === USER_PAT_PATH || rest.startsWith(`${USER_PAT_PATH}/`);
}

function apiRestPath(urlOrPath: string): string {
  const path = normalizeApiPath(urlOrPath);
  return path.startsWith('/api/') ? path.slice(4) : path;
}

/**
 * Profile resources under `/api/users/me/*` (AI runtime, prefs).
 * A 401 here is a resource miss, not proof the shell JWT is dead.
 */
export function isUserMePath(urlOrPath: string): boolean {
  const rest = apiRestPath(urlOrPath);
  return rest === '/users/me' || rest.startsWith('/users/me/');
}

/** 401 must not flip shell auth to `session_expired` or enter the refresh lock. */
export function isNonSession401Path(urlOrPath: string): boolean {
  return isIdentityScopedApiPath(urlOrPath) || isUserMePath(urlOrPath);
}

/** User-scoped session paths: keep live JWT when header pid ≠ JWT pid (G-A157). */
export function isUserScopedSessionPath(urlOrPath: string): boolean {
  if (isIdentityScopedApiPath(urlOrPath)) return true;
  const path = normalizeApiPath(urlOrPath);
  const rest = path.startsWith('/api/') ? path.slice(4) : path;
  return rest === '/projects' || rest === '/projects/';
}

/** MCP OAuth authorize resume — binds code to user_id, not workspace project key (G-A174). */
export function isMcpOAuthAuthorizePath(urlOrPath: string): boolean {
  const path = normalizeApiPath(urlOrPath);
  return (
    path.endsWith('/mcp/.well-known/oauth-authorize') ||
    path.endsWith('/api/oauth2/authorize')
  );
}

/** Paths that must send the freshest identity JWT (PAT CRUD, project list, MCP Connect resume). */
export function isIdentityBearerSessionPath(urlOrPath: string): boolean {
  return isUserScopedSessionPath(urlOrPath) || isMcpOAuthAuthorizePath(urlOrPath);
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
