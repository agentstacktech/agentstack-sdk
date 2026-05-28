/**
 * Scope-aware discovery of a `ServiceWorkerRegistration` (browser-only).
 *
 * SPA supplies a resolved `scopeLookupUrl` (Workbox / Vite BASE_URL + sw.js),
 * so this module stays free of `import.meta` and reusable from widgets or tests.
 */

export type GetBestServiceWorkerRegistrationFromNavigatorOptions = {
  /**
   * Re-probe after a short delay (WebKit sometimes returns an empty registration list for one tick
   * around ``controllerchange`` / right after ``register()`` resolves).
   */
  retries?: number;
  retryDelayMs?: number;
};

export type GetBestServiceWorkerRegistrationFromNavigatorInput = {
  /**
   * URL passed to ``getRegistration(scope)`` first (absolute preferred).
   * Empty string skips the scope-first lookup (same as legacy ``scopeUrlForLookup === ''``).
   */
  scopeLookupUrl: string;
  /** Current document URL for scope compatibility checks. */
  pageHref: string;
};

/** Page URL is controlled by a registration with this scope (origin + path prefix). */
export function pageUrlMatchesServiceWorkerScope(pageHref: string, registrationScope: string): boolean {
  if (!pageHref || !registrationScope) return true;
  try {
    const page = new URL(pageHref);
    const scope = new URL(registrationScope, pageHref);
    if (page.origin !== scope.origin) return false;
    const scopePath = scope.pathname.endsWith('/') ? scope.pathname : `${scope.pathname}/`;
    const pagePath = page.pathname.endsWith('/') ? page.pathname : `${page.pathname}/`;
    return pagePath.startsWith(scopePath);
  } catch {
    return pageHref.startsWith(registrationScope);
  }
}

async function probeOnce(input: GetBestServiceWorkerRegistrationFromNavigatorInput): Promise<ServiceWorkerRegistration | null> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return null;

  const href = input.pageHref;
  const scopeUrlForLookup = (input.scopeLookupUrl || '').trim();

  let reg =
    scopeUrlForLookup && typeof navigator.serviceWorker.getRegistration === 'function'
      ? await navigator.serviceWorker.getRegistration(scopeUrlForLookup).catch(() => null)
      : null;
  if (reg && (!href || pageUrlMatchesServiceWorkerScope(href, reg.scope))) {
    return reg;
  }
  reg = null;

  reg =
    href && typeof navigator.serviceWorker.getRegistration === 'function'
      ? await navigator.serviceWorker.getRegistration(href).catch(() => null)
      : null;
  if (!reg && typeof navigator.serviceWorker.getRegistration === 'function') {
    reg = await navigator.serviceWorker.getRegistration();
  }
  if (reg && (!href || pageUrlMatchesServiceWorkerScope(href, reg.scope))) {
    return reg;
  }
  reg = null;

  const getRegs = navigator.serviceWorker.getRegistrations;
  if (typeof getRegs !== 'function') return null;

  const all = await getRegs.call(navigator.serviceWorker);
  if (!all.length) return null;

  let best: ServiceWorkerRegistration | null = null;
  let bestScopeLen = -1;
  for (const r of all) {
    if (href && !pageUrlMatchesServiceWorkerScope(href, r.scope)) continue;
    if (r.scope.length > bestScopeLen) {
      bestScopeLen = r.scope.length;
      best = r;
    }
  }
  return best ?? all[0] ?? null;
}

/**
 * Best-effort registration for the current page, mirroring AgentStack SPA semantics
 * (scope-first, then client URL, then longest-prefix scan).
 */
export async function getBestServiceWorkerRegistrationFromNavigator(
  input: GetBestServiceWorkerRegistrationFromNavigatorInput,
  opts?: GetBestServiceWorkerRegistrationFromNavigatorOptions
): Promise<ServiceWorkerRegistration | null> {
  const retries = Math.max(0, opts?.retries ?? 0);
  const retryDelayMs = Math.max(0, opts?.retryDelayMs ?? 55);
  for (let attempt = 0; attempt <= retries; attempt++) {
    const found = await probeOnce(input);
    if (found) return found;
    if (attempt < retries) {
      await new Promise((r) => setTimeout(r, retryDelayMs));
    }
  }
  return null;
}
