/**
 * Nginx / edge returns HTTP 503 while upstream is restarting:
 * `{ status: "starting", message: "...warming up...", retry_after_seconds: 5 }`
 * + `Retry-After: 5`. Clients must retry and must not open circuit breakers.
 *
 * Login mint also returns 503 with ``auth_mint_in_progress`` / ``project_key_unavailable``
 * — same client policy (retry, do not trip CB).
 */

import { isTypedDna503Code } from '../utils/classifyAuthFailure';

export const API_WARMING_UP_CODE = 'api_warming_up' as const;
/** Nginx 502/504 mapped body — distinct from API cold status=starting (F1b-06). */
export const UPSTREAM_UNAVAILABLE_CODE = 'upstream_unavailable' as const;

/** Backend login mint / project-key warm codes (503 + Retry-After). */
export const AUTH_MINT_BUSY_CODES = new Set([
  'auth_mint_in_progress',
  'auth_mint_timeout',
  'project_key_unavailable',
  'storefront_warming',
  API_WARMING_UP_CODE,
  UPSTREAM_UNAVAILABLE_CODE,
]);

const WARMING_MESSAGE_RE = /warming up|retry shortly|upstream unavailable|starting|is warming/i;

/** Detect warming payload from JSON body (nginx @api_upstream_unavailable). */
export function parseApiWarmingFromBody(body: unknown): {
  warming: boolean;
  retryAfterSec?: number;
  code?: string;
} {
  if (body == null || typeof body !== 'object' || Array.isArray(body)) {
    return { warming: false };
  }
  const root = body as Record<string, unknown>;
  const detail =
    root.detail && typeof root.detail === 'object' && !Array.isArray(root.detail)
      ? (root.detail as Record<string, unknown>)
      : null;

  const status = String(root.status ?? detail?.status ?? '');
  const message = String(root.message ?? detail?.message ?? '');
  const code = String(root.code ?? detail?.code ?? root.error ?? '');

  const warming =
    status === 'starting' ||
    status === 'unavailable' ||
    AUTH_MINT_BUSY_CODES.has(code) ||
    WARMING_MESSAGE_RE.test(message);

  if (!warming) {
    return { warming: false };
  }

  const fromBody =
    Number(root.retry_after_seconds ?? detail?.retry_after_seconds) ||
    Number(root.retry_after ?? detail?.retry_after) ||
    0;
  const retryAfterSec = fromBody > 0 ? Math.max(1, Math.floor(fromBody)) : undefined;
  return {
    warming: true,
    retryAfterSec,
    code: code || (status === 'unavailable' ? UPSTREAM_UNAVAILABLE_CODE : undefined),
  };
}

/** True when ServerError (or duck-typed) is deploy / cold-start warming. */
export function isApiWarmingUpError(error: unknown): boolean {
  if (error == null || typeof error !== 'object') return false;
  const e = error as {
    status?: number;
    apiCode?: string;
    message?: string;
    name?: string;
  };
  if (e.apiCode && AUTH_MINT_BUSY_CODES.has(e.apiCode)) return true;
  if (e.status === 503 && WARMING_MESSAGE_RE.test(String(e.message || ''))) {
    return true;
  }
  if (
    e.name === 'ServerError' &&
    e.status === 503 &&
    /503|server error/i.test(String(e.message || ''))
  ) {
    // Bare 503 without body — treat as transient warm/restart for CB only when message hints.
    return false;
  }
  return WARMING_MESSAGE_RE.test(String(e.message || ''));
}

/**
 * Transient auth-path faults that must not open the circuit breaker
 * (deploy warm-up, mint lease, login timeouts during restart).
 */
export function isAuthTransientRetryError(error: unknown): boolean {
  if (isApiWarmingUpError(error)) return true;
  if (error == null || typeof error !== 'object') return false;
  const e = error as { name?: string; message?: string; status?: number; apiCode?: string };
  if (e.name === 'TimeoutError' || /timeout/i.test(String(e.message || ''))) {
    return true;
  }
  if (e.apiCode && AUTH_MINT_BUSY_CODES.has(e.apiCode)) return true;
  if (e.apiCode && isTypedDna503Code(e.apiCode)) return true;
  if (e.status === 503) return true;
  return false;
}

/** Delay before next attempt; prefer Retry-After / retry_after_seconds (+ jitter F3-06). */
export function warmingRetryDelayMs(
  error: unknown,
  fallbackMs = 5_000,
): number {
  let base = fallbackMs;
  if (error != null && typeof error === 'object') {
    const sec = Number((error as { retryAfterSec?: number }).retryAfterSec);
    if (Number.isFinite(sec) && sec > 0) {
      base = Math.min(30_000, Math.max(1_000, Math.floor(sec * 1000)));
    }
  }
  // Full jitter: uniform in [0.75*base, 1.25*base] to desync parallel login/seo/oauth.
  const jitter = 0.75 + Math.random() * 0.5;
  return Math.min(30_000, Math.max(1_000, Math.floor(base * jitter)));
}
