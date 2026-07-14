/**
 * Double-submit CSRF token (`csrf_token` cookie ↔ `X-CSRF-Token` header).
 * Gene: shared.middleware.csrf.gen1
 */

/** Read CSRF cookie set by GET responses through CsrfMiddleware. */
export function readCsrfTokenFromCookie(): string | null {
  if (typeof document === 'undefined' || !document.cookie) return null;
  const parts = document.cookie.split(';');
  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed.startsWith('csrf_token=')) continue;
    const raw = trimmed.slice('csrf_token='.length);
    if (!raw) return null;
    try {
      return decodeURIComponent(raw);
    } catch {
      return raw;
    }
  }
  return null;
}

/** Attach CSRF header when cookie exists (skipped by server for Bearer / API key). */
export function applyCsrfHeader(headers: Record<string, string>): void {
  const csrf = readCsrfTokenFromCookie();
  if (csrf && !headers['X-CSRF-Token'] && !headers['x-csrf-token']) {
    headers['X-CSRF-Token'] = csrf;
  }
}

/** True when request relies on session cookies instead of Bearer / API key. */
export function usesCookieSessionAuth(headers: Record<string, string>): boolean {
  const auth = (headers['Authorization'] || headers['authorization'] || '').trim();
  if (auth.toLowerCase().startsWith('bearer ') && auth.length > 7) return false;
  if (headers['X-API-Key'] || headers['x-api-key']) return false;
  return true;
}

const MUTATION_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export function shouldIncludeCredentials(
  method: string | undefined,
  headers: Record<string, string>,
): boolean {
  if (typeof window === 'undefined') return false;
  const m = (method || 'GET').toUpperCase();
  return MUTATION_METHODS.has(m) && usesCookieSessionAuth(headers);
}
