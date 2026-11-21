/**
 * Single spine for hosted script.run recoverable codes + retry delay (G-SDK-06 / Wave N4).
 * Gene: sdk.commerce.hosted.gen1
 */

export const HOSTED_MCP_RECOVERABLE_CODES = [
  'hosted_cookie_missing',
  'hosted_app_required',
  'auth_required',
  'export_not_public',
  'text_revision_conflict',
  'hosted_shared_data_denied',
  'db_unavailable',
  'revision_prefetch_failed',
  'revision_conflict',
  'run_in_progress',
  'run_lock_timeout',
  'neural_flush',
  'neural_flush_backlog',
] as const;

export type HostedMcpRecoverableCode = (typeof HOSTED_MCP_RECOVERABLE_CODES)[number];

export function isHostedMcpRecoverableCode(
  code: string,
  payload?: Record<string, unknown>,
): boolean {
  const c = code.trim();
  if ((HOSTED_MCP_RECOVERABLE_CODES as readonly string[]).includes(c)) return true;
  if (c === 'db_unavailable' && payload) {
    const fp = String(payload.failure_phase ?? '').trim();
    if (fp === 'neural_flush' || fp === 'neural_flush_backlog') return true;
  }
  return false;
}

export function hostedMcpRetryDelayMs(
  retryAfterMs: number | undefined,
  capMs = 30_000,
  fallbackMs = 2500,
): number {
  const n = Number(retryAfterMs);
  if (Number.isFinite(n) && n >= 0) return Math.min(capMs, Math.floor(n));
  return Math.min(capMs, fallbackMs);
}

export function sleepMs(ms: number, signal?: AbortSignal): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }
    const timer = setTimeout(resolve, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(new DOMException('Aborted', 'AbortError'));
    };
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}