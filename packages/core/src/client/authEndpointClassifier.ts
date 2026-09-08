/**
 * Session-auth HTTP paths — Bearer omit rules do not apply (G-A121).
 * Genetic: core.auth.session_cache_contour.gen1
 */

const SESSION_AUTH_PATHS = [
  '/auth/login',
  '/auth/me',
  '/auth/switch-project',
  '/auth/refresh',
] as const;

/** Paths where Bearer must not be stripped for JWT↔header mismatch. */
export function isSessionAuthEndpoint(url: string): boolean {
  if (!url) return false;
  return SESSION_AUTH_PATHS.some((p) => url.includes(p));
}

export function isSwitchProjectEndpoint(url: string): boolean {
  return Boolean(url && url.includes('/auth/switch-project'));
}

/**
 * Credential / mint POSTs — session bridge must not remint or strip Bearer
 * (would deadlock on switch-project awaiting its own inflight).
 */
export function isAuthMintCredentialPath(url: string): boolean {
  if (!url) return false;
  return (
    url.includes('/auth/login') ||
    url.includes('/auth/register') ||
    url.includes('/auth/refresh') ||
    isSwitchProjectEndpoint(url)
  );
}

const AUTH_MINT_POLL_CODES = new Set([
  'auth_mint_in_progress',
  'switch_in_progress',
  'login_capacity',
  'project_key_unavailable',
  'auth_mint_timeout',
]);

/** Extract stable API code from FastAPI auth mint/switch bodies. */
export function extractAuthResponseCode(data: unknown): string | undefined {
  if (!data || typeof data !== 'object') return undefined;
  const root = data as { code?: unknown; detail?: unknown };
  if (typeof root.code === 'string' && root.code.trim()) return root.code.trim();
  const detail = root.detail;
  if (detail && typeof detail === 'object') {
    const code = (detail as { code?: unknown }).code;
    if (typeof code === 'string' && code.trim()) return code.trim();
  }
  return undefined;
}

/**
 * Login/switch mint polling — 409/503 with typed codes are expected, not operator errors.
 */
export function isExpectedAuthMintPollResponse(
  url: string,
  status: number,
  data: unknown,
): boolean {
  if (!isSessionAuthEndpoint(url)) return false;
  const code = extractAuthResponseCode(data);
  if (!code || !AUTH_MINT_POLL_CODES.has(code)) return false;
  if (code === 'switch_in_progress') return status === 409;
  return status === 503 || status === 409;
}
