/**
 * Hosted / vertical session vault — universal for all tenant `/s/{pid}/` surfaces.
 * Gene: sdk.commerce.hosted.gen1 · frontend.hosted.vertical.gen1
 */

export const HOSTED_SESSION_TOKEN_KEY = 'vertical:token';
export const HOSTED_SESSION_WORKSPACE_KEY = 'vertical:workspace_pid';

export type SessionTokenPayload = {
  access_token?: string | null;
  hybrid_key?: string | null;
  session?: { user_token?: string | null } | null;
};

function isJwtShape(value: string): boolean {
  return value.split('.').length >= 3;
}

/** Extract HS256 JWT from mint/login/switch response (never send colon hybrid as Bearer). */
export function resolveSessionBearerToken(data: SessionTokenPayload): string | null {
  const access = String(data.access_token ?? '').trim();
  if (access && isJwtShape(access)) return access;
  const userToken = String(data.session?.user_token ?? '').trim();
  if (userToken && isJwtShape(userToken)) return userToken;
  const hybrid = String(data.hybrid_key ?? '').trim();
  if (!hybrid) return null;
  if (isJwtShape(hybrid) && !hybrid.includes(':')) return hybrid;
  const parts = hybrid.split(':', 4);
  if (parts.length === 4) {
    const jwt = String(parts[3] ?? '').trim();
    if (jwt && isJwtShape(jwt)) return jwt;
  }
  return null;
}

/** Normalize stored session value — hybrid ``uid:pid::jwt`` → JWT segment only. */
export function normalizeBearerToken(raw: string | null | undefined): string | null {
  const token = String(raw ?? '').trim();
  if (!token) return null;
  if (isJwtShape(token) && !token.includes(':')) return token;
  return resolveSessionBearerToken({ hybrid_key: token });
}

export function readHostedSessionToken(): string | null {
  if (typeof sessionStorage === 'undefined') return null;
  return normalizeBearerToken(sessionStorage.getItem(HOSTED_SESSION_TOKEN_KEY));
}

export function readHostedWorkspaceProjectId(): number | null {
  if (typeof sessionStorage === 'undefined') return null;
  const raw = sessionStorage.getItem(HOSTED_SESSION_WORKSPACE_KEY);
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function storeHostedSession(token: string, workspaceProjectId: number): void {
  if (typeof sessionStorage === 'undefined') return;
  const bearer = normalizeBearerToken(token) ?? token;
  sessionStorage.removeItem('access_token');
  sessionStorage.removeItem('refresh_token');
  sessionStorage.setItem(HOSTED_SESSION_TOKEN_KEY, bearer);
  sessionStorage.setItem(HOSTED_SESSION_WORKSPACE_KEY, String(workspaceProjectId));
}

export function clearHostedSession(): void {
  if (typeof sessionStorage === 'undefined') return;
  sessionStorage.removeItem(HOSTED_SESSION_TOKEN_KEY);
  sessionStorage.removeItem(HOSTED_SESSION_WORKSPACE_KEY);
  sessionStorage.removeItem('access_token');
  sessionStorage.removeItem('refresh_token');
}
