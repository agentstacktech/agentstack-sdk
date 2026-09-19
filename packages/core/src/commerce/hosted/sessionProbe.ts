/**
 * Lightweight hosted session probe — GET /api/auth/me with session vault headers.
 * Gene: sdk.commerce.hosted.gen1
 */
import { buildHostedCommerceHeaders } from './requestHeaders';
import { readHostedSessionToken } from './sessionVault';

export type ProbeHostedSessionOptions = {
  projectId: number;
  apiBase?: string;
  fetchFn?: typeof fetch;
};

/** Returns true when vertical:token session is valid for the tenant PID. */
export async function probeHostedSession(options: ProbeHostedSessionOptions): Promise<boolean> {
  if (!readHostedSessionToken()) return false;
  const fetchFn = options.fetchFn ?? fetch;
  const base = String(options.apiBase ?? '').replace(/\/$/, '');
  const mePath = base
    ? `${base.endsWith('/api') ? base : `${base}/api`}/auth/me`
    : '/api/auth/me';
  try {
    const res = await fetchFn(mePath, {
      method: 'GET',
      credentials: 'include',
      headers: buildHostedCommerceHeaders(options.projectId),
    });
    return res.ok;
  } catch {
    return false;
  }
}
