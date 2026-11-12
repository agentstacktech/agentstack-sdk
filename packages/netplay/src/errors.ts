/**
 * Plain error kinds for network transports. A transport throws `NetplayError`; the session turns
 * `kind` into `snapshot.issue` and `netStatus()` into words («Войдите, чтобы играть онлайн»).
 */
export type NetIssue = 'auth' | 'rate' | 'not-published';
export type NetErrorKind = NetIssue | 'offline' | 'server';

export class NetplayError extends Error {
  constructor(readonly kind: NetErrorKind, readonly code: string, message?: string, readonly retryAfterMs?: number) {
    super(message ? `${code}: ${message}` : code);
    this.name = 'NetplayError';
  }
}

const AUTH = new Set(['unauthorized', 'auth_required', 'not_authenticated', 'session_user_required', 'relogin_required', 'session_setup_required', 'hosted_app_session_required', 'scope_error', 'expired', 'AUTH']);
const RATE = new Set(['rate_limit_exceeded', 'rate_limited', 'RATE_LIMIT', 'quota_exceeded', 'fuel_exhausted', 'sandbox_limit_exceeded', 'too_many_requests']);
const MISSING = new Set(['script_not_found', 'NO_EXPORT', 'export_not_found', 'action_not_found']);

/** Map a platform / room-script error code (+ HTTP status) to a kind. */
export function errorKind(code: string, status = 200): NetErrorKind {
  if (status === 401 || status === 403 || AUTH.has(code)) return 'auth';
  if (status === 429 || RATE.has(code) || /quota|rate.?limit/i.test(code)) return 'rate';
  if (MISSING.has(code)) return 'not-published';
  if (status === 0 || status >= 500) return 'offline';
  return 'server';
}

export const NET_ISSUES: readonly NetIssue[] = ['auth', 'rate', 'not-published'];
export function isIssue(x: unknown): x is NetIssue { return NET_ISSUES.includes(x as NetIssue); }
