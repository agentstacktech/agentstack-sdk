/**
 * Browser access_token helpers — Session OS V3.3 / FLOW-06+.
 * Prefer sessionStorage (tab-scoped SPA), keep localStorage as legacy mirror.
 * When both exist, prefer the JWT with the newer `iat`.
 */

function readStore(store: Storage | undefined, key: string): string {
  if (!store) return '';
  try {
    return (store.getItem(key) || '').trim();
  } catch {
    return '';
  }
}

function writeStore(store: Storage | undefined, key: string, value: string): void {
  if (!store || !value) return;
  try {
    store.setItem(key, value);
  } catch {
    /* ignore quota / private mode */
  }
}

function removeStore(store: Storage | undefined, key: string): void {
  if (!store) return;
  try {
    store.removeItem(key);
  } catch {
    /* ignore */
  }
}

function jwtIat(token: string): number {
  try {
    const mid = token.split('.')[1];
    if (!mid) return 0;
    const json = JSON.parse(
      atob(mid.replace(/-/g, '+').replace(/_/g, '/')),
    ) as { iat?: number };
    const iat = Number(json?.iat);
    return Number.isFinite(iat) && iat > 0 ? iat : 0;
  } catch {
    return 0;
  }
}

function jwtJtiNorm(token: string): string {
  try {
    const mid = token.split('.')[1];
    if (!mid) return '';
    const json = JSON.parse(
      atob(mid.replace(/-/g, '+').replace(/_/g, '/')),
    ) as { jti?: string };
    return String(json?.jti || '').replace(/-/g, '');
  } catch {
    return '';
  }
}

/** Pick the fresher of two JWTs by `iat` (ties → prefer `a`). */
export function pickFresherAccessToken(a: string, b: string): string {
  const ta = (a || '').trim();
  const tb = (b || '').trim();
  if (!ta) return tb;
  if (!tb) return ta;
  return jwtIat(tb) > jwtIat(ta) ? tb : ta;
}

/**
 * Read access_token: fresher of session vs local (legacy).
 */
export function readBrowserAccessToken(): string {
  if (typeof window === 'undefined') return '';
  const sessionTok = readStore(window.sessionStorage, 'access_token');
  const localTok = readStore(window.localStorage, 'access_token');
  return pickFresherAccessToken(sessionTok, localTok);
}

/**
 * Mirror mint into session (primary) + local (legacy) so Hybrid Broker and
 * tab-scoped FE getters stay coherent.
 */
export function writeBrowserAccessToken(token: string): void {
  if (typeof window === 'undefined' || !token) return;
  writeStore(window.sessionStorage, 'access_token', token);
  writeStore(window.localStorage, 'access_token', token);
}

/** Clear access_token from both stores. */
export function clearBrowserAccessToken(): void {
  if (typeof window === 'undefined') return;
  removeStore(window.sessionStorage, 'access_token');
  removeStore(window.localStorage, 'access_token');
}

/** Clear matching dead JTI from both stores. Returns true if anything cleared. */
export function clearBrowserAccessTokenIfJtiPrefix(jtiPrefix: string): boolean {
  const prefix = String(jtiPrefix || '')
    .replace(/-/g, '')
    .slice(0, 12);
  if (!prefix || typeof window === 'undefined') return false;
  let cleared = false;
  for (const store of [window.sessionStorage, window.localStorage]) {
    const stored = readStore(store, 'access_token');
    if (stored && jwtJtiNorm(stored).startsWith(prefix)) {
      removeStore(store, 'access_token');
      cleared = true;
    }
  }
  return cleared;
}
