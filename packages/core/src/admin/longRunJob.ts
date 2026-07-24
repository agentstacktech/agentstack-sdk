/**
 * Admin long-run job plane (`core.admin.long_run_job.gen1`).
 */
import type { HTTPClient } from '../client/http-client';

export type AdminLongRunJobStatus =
  | 'pending'
  | 'running'
  | 'succeeded'
  | 'failed'
  | 'skipped';

export interface AdminLongRunJobStep {
  id: string;
  status: string;
  message?: string;
}

export interface AdminLongRunJob {
  job_id: string;
  status: AdminLongRunJobStatus;
  poll_url: string;
  steps?: AdminLongRunJobStep[];
  error?: string;
  started_at?: string;
  finished_at?: string;
}

export interface EnqueueAdminLongRunJobResult {
  run_id: string;
  status: AdminLongRunJobStatus;
  poll_url: string;
}

/** Normalize poll paths so HTTP client does not produce `/api/api/...`. */
export function normalizeAdminApiPath(pathOrUrl: string): string {
  const raw = pathOrUrl.trim();
  if (!raw) return raw;
  if (raw.startsWith('http://') || raw.startsWith('https://')) {
    return raw;
  }
  let path = raw.startsWith('/') ? raw : `/${raw}`;
  if (path.startsWith('/api/')) {
    path = path.slice(4) || '/';
  } else if (path === '/api') {
    path = '/';
  }
  return path.startsWith('/') ? path : `/${path}`;
}

export async function enqueueAdminLongRunJob(
  http: HTTPClient,
  postUrl: string,
  body: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<EnqueueAdminLongRunJobResult> {
  const res = await http.post<EnqueueAdminLongRunJobResult>(postUrl, body, {
    skipBatching: true,
    signal,
    timeout: 30_000,
  });
  return res.data;
}

export async function pollAdminLongRunJob<T extends { status?: string }>(
  http: HTTPClient,
  pollUrl: string,
  signal?: AbortSignal,
): Promise<T> {
  const res = await http.get<T>(normalizeAdminApiPath(pollUrl), { signal, timeout: 15_000 });
  return res.data;
}

const TERMINAL_JOB_STATUSES = new Set([
  'succeeded',
  'failed',
  'skipped',
  'success',
  'ok',
  'cancelled',
]);

export async function waitForAdminLongRunJobTerminal<T extends { status?: string }>(
  http: HTTPClient,
  pollUrl: string,
  opts?: { intervalMs?: number; maxWaitMs?: number; signal?: AbortSignal },
): Promise<T> {
  const intervalMs = opts?.intervalMs ?? 2000;
  const maxWaitMs = opts?.maxWaitMs ?? 180_000;
  const started = Date.now();
  for (;;) {
    const data = await pollAdminLongRunJob<T>(http, pollUrl, opts?.signal);
    const status = String(data.status ?? '').toLowerCase();
    if (status && !['running', 'pending'].includes(status) && TERMINAL_JOB_STATUSES.has(status)) {
      return data;
    }
    if (status && !['running', 'pending'].includes(status)) {
      return data;
    }
    if (Date.now() - started >= maxWaitMs) {
      throw new Error(`admin_long_run_job_timeout after ${maxWaitMs}ms`);
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
}
