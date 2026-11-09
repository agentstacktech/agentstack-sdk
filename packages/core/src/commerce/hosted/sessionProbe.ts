/**
 * Lightweight hosted session probe — GET /api/auth/me with session vault headers.
 * Gene: sdk.commerce.hosted.gen1 · parity with hosted wire G-A24 retries.
 */
import { isTransientSessionMissReason } from '../../utils/classifyAuthFailure';
import { buildHostedCommerceHeaders } from './requestHeaders';
import { isHostedPostLoginGraceActive, readHostedSessionToken } from './sessionVault';

export type ProbeHostedSessionOptions = {
  projectId: number;
  apiBase?: string;
  fetchFn?: typeof fetch;
};

function sleepMs(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function readAuthDetailCode(res: Response): Promise<string> {
  try {
    const body = (await res.clone().json()) as { detail?: unknown };
    const detail = body?.detail;
    if (detail && typeof detail === 'object' && !Array.isArray(detail)) {
      const row = detail as { code?: string; reason?: string };
      return String(row.reason || row.code || '').trim().toLowerCase();
    }
  } catch {
    /* ignore */
  }
  return '';
}

/** Returns true when vertical:token session is valid for the tenant PID. */
export async function probeHostedSession(options: ProbeHostedSessionOptions): Promise<boolean> {
  if (!readHostedSessionToken()) return false;
  const fetchFn = options.fetchFn ?? fetch;
  const base = String(options.apiBase ?? '').replace(/\/$/, '');
  const mePath = base
    ? `${base.endsWith('/api') ? base : `${base}/api`}/auth/me`
    : '/api/auth/me';
  const delays = [0, 400, 900];
  try {
    for (let i = 0; i < delays.length; i += 1) {
      if (delays[i] > 0) await sleepMs(delays[i]);
      const res = await fetchFn(mePath, {
        method: 'GET',
        credentials: 'include',
        headers: buildHostedCommerceHeaders(options.projectId),
      });
      if (res.ok) return true;
      if (res.status === 503) {
        if (i < delays.length - 1) continue;
        return false;
      }
      const code = await readAuthDetailCode(res);
      if (isTransientSessionMissReason(code)) {
        if (i < delays.length - 1) continue;
        if (code === 'authz_generation_stale' && !isHostedPostLoginGraceActive()) {
          return false;
        }
        return true;
      }
      return false;
    }
    return false;
  } catch {
    return false;
  }
}
