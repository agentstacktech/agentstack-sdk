/**
 * Public-route SoT for SDK HTTPClient (parity with SPA publicRoutes.ts).
 *
 * Gene: frontend.boot.orchestration.gen1 / core.auth.session_cache_contour.gen1
 * CI: keep in sync with agentstack-frontend/src/utils/publicRoutes.ts
 *
 * Invariant (incident 2026-07-17 G1): never put bare `/user` or `/dev` here —
 * prefix matching would treat the entire dual-shell as marketing-public.
 */

/** Marketing / unauthenticated promo surfaces (401 must not force login redirect). */
export const SDK_MARKETING_PUBLIC_ROUTES = [
  '/',
  '/pricing',
  '/faq',
  '/grants',
  '/showcase',
  '/showcase/course-academy',
  '/showcase/helpdesk-bot',
  '/showcase/collectibles-bazaar',
  '/showcase/creator-portfolio',
  '/api-docs',
  '/webhook-docs',
  '/ecosystem-docs',
  '/builder',
  '/sdk-demo',
  '/platform-try',
  '/mcp-docs',
  '/buffs-docs',
  '/case-studies',
  '/quick-start',
  '/host-site',
  '/capabilities',
  '/docs/host-static-site',
  '/trust',
  '/use-cases',
  '/data-policy',
  '/privacy-policy',
  '/terms-of-service',
  '/why-agentstack',
  '/for-developers',
  '/developers',
  '/login',
  '/register',
  '/oauth/callback',
  '/pay',
  '/shop',
  '/activate',
] as const;

/** Hosted storefront / static sites (guest browse). */
export const SDK_HOSTED_GUEST_PREFIXES = ['/s'] as const;

/**
 * Guest commerce bridges (checkout without full shell auth storm).
 * Authenticated shell paths under `/user/shop/checkout` are NOT marketing-public;
 * use BootPlane `commerce_public` + AuthQueryPolicy instead of silent 401 swallow.
 */
export const SDK_GUEST_COMMERCE_PREFIXES = [
  '/shop/checkout',
  '/pay/',
] as const;

/** @deprecated Use {@link SDK_MARKETING_PUBLIC_ROUTES} — kept for import compatibility. */
export const SDK_PUBLIC_ROUTES = SDK_MARKETING_PUBLIC_ROUTES;

function normalizePath(pathname: string): string {
  return pathname === '/' ? '/' : pathname.replace(/\/$/, '');
}

function matchesPrefix(normalizedPath: string, prefix: string): boolean {
  if (prefix === '/') {
    return false;
  }
  return normalizedPath === prefix || normalizedPath.startsWith(`${prefix}/`);
}

export function isMarketingPublicRoute(pathname: string): boolean {
  const normalizedPath = normalizePath(pathname);
  if ((SDK_MARKETING_PUBLIC_ROUTES as readonly string[]).includes(normalizedPath)) {
    return true;
  }
  return SDK_MARKETING_PUBLIC_ROUTES.some((route) => matchesPrefix(normalizedPath, route));
}

export function isHostedGuestRoute(pathname: string): boolean {
  const normalizedPath = normalizePath(pathname);
  return SDK_HOSTED_GUEST_PREFIXES.some((route) => matchesPrefix(normalizedPath, route));
}

export function isGuestCommerceRoute(pathname: string): boolean {
  const normalizedPath = normalizePath(pathname);
  if (
    normalizedPath.startsWith('/shop/checkout') ||
    normalizedPath.startsWith('/user/shop/checkout') ||
    /\/checkout(\/|$)/.test(normalizedPath)
  ) {
    return true;
  }
  return SDK_GUEST_COMMERCE_PREFIXES.some((route) => matchesPrefix(normalizedPath, route));
}

/**
 * Dual-shell authenticated surfaces — 401 must drive Auth FSM (not silent swallow).
 * Exact `/user` or `/dev` hubs are shell, not marketing-public.
 */
export function isAuthenticatedShellRoute(pathname: string): boolean {
  const normalizedPath = normalizePath(pathname);
  if (normalizedPath === '/user' || normalizedPath === '/dev') {
    return true;
  }
  if (normalizedPath.startsWith('/user/') || normalizedPath.startsWith('/dev/')) {
    // Guest commerce under /user/shop/checkout is shell-scoped but BootPlane-quarantined.
    return true;
  }
  if (normalizedPath.startsWith('/platform/') || normalizedPath === '/platform') {
    return true;
  }
  return false;
}

/**
 * True when pathname is a marketing/hosted surface where 401 must not redirect to login.
 * Guest commerce under `/user/*` is intentionally FALSE so Auth FSM can run;
 * BootPlane AuthQueryPolicy separately cancels auth-scoped React Query.
 */
export function isSdkPublicRoute(pathname: string): boolean {
  if (isAuthenticatedShellRoute(pathname) && !isGuestCommerceRoute(pathname)) {
    return false;
  }
  // Guest commerce under /user/shop/checkout: do not treat as marketing-public
  // (silent 401 swallow caused checkout storm). Hosted /s and /shop stay public.
  if (pathname.startsWith('/user/') || pathname === '/user') {
    return false;
  }
  if (pathname.startsWith('/dev/') || pathname === '/dev') {
    // Promo `/developers` / `/for-developers` remain marketing; bare `/dev` is shell hub.
    return false;
  }
  return isMarketingPublicRoute(pathname) || isHostedGuestRoute(pathname);
}
