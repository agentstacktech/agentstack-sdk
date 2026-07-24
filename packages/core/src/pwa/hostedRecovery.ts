/**
 * Hosted SPA chunk recovery ladder (`frontend.hosted.chunk_recovery.gen1`).
 * Shared by CardGame and future `/s/{pid}/{bucket}/` apps.
 *
 * Escalation (bounded):
 * 1. Soft reload + `_cr=` cache-bust
 * 2. SW unregister + cache delete + deep reload
 * 3. Dispatch `hosted:chunk_recovery_failed` for UI fallback
 */
import { isChunkLikeErrorMessage } from './chunkErrors';

export const HOSTED_CHUNK_RECOVERY_QUERY_PARAM = '_cr';

export interface HostedRecoveryOptions {
  buildId: string;
  /** e.g. `./` or `/s/1438/arcanestack-prod/` */
  bucketBasePath?: string;
  /** Called before navigation reload (telemetry). */
  onBeacon?: (event: string, detail?: Record<string, unknown>) => void;
}

function sessionKey(suffix: string, buildId: string): string {
  return `hosted:${suffix}::${buildId}`;
}

function navigateWithCacheBust(): void {
  if (typeof window === 'undefined') return;
  try {
    const u = new URL(window.location.href);
    u.searchParams.set(HOSTED_CHUNK_RECOVERY_QUERY_PARAM, String(Date.now()));
    window.location.replace(u.toString());
  } catch {
    window.location.reload();
  }
}

async function unregisterServiceWorkers(): Promise<void> {
  if (typeof navigator === 'undefined' || !navigator.serviceWorker) return;
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(regs.map((r) => r.unregister()));
  } catch {
    /* ignore */
  }
  try {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => caches.delete(k)));
  } catch {
    /* ignore */
  }
}

/**
 * Attempt recovery from a chunk-like failure. Returns true if a reload was scheduled.
 */
export function tryRecoverFromHostedChunkFailure(
  err: unknown,
  opts: HostedRecoveryOptions,
): boolean {
  if (typeof window === 'undefined' || typeof sessionStorage === 'undefined') {
    return false;
  }
  const msg =
    err instanceof Error
      ? `${err.message} ${err.name}`
      : typeof err === 'string'
        ? err
        : '';
  if (!isChunkLikeErrorMessage(msg)) return false;

  const softFlag = sessionKey('chunk_reload_once', opts.buildId);
  const deepFlag = sessionKey('chunk_deep_reload_once', opts.buildId);

  try {
    if (sessionStorage.getItem(softFlag) !== '1') {
      sessionStorage.setItem(softFlag, '1');
      opts.onBeacon?.('hosted.chunk_recovery.soft_reload', { buildId: opts.buildId });
      navigateWithCacheBust();
      return true;
    }
    if (sessionStorage.getItem(deepFlag) !== '1') {
      sessionStorage.setItem(deepFlag, '1');
      opts.onBeacon?.('hosted.chunk_recovery.deep', { buildId: opts.buildId });
      void unregisterServiceWorkers().finally(() => navigateWithCacheBust());
      return true;
    }
    opts.onBeacon?.('hosted.chunk_recovery.ineffective', { buildId: opts.buildId });
    window.dispatchEvent(
      new CustomEvent('hosted:chunk_recovery_failed', { detail: { buildId: opts.buildId } }),
    );
  } catch {
    window.location.reload();
    return true;
  }
  return false;
}

/** Install global error handlers for hosted SPA chunk recovery. */
export function installHostedChunkRecovery(opts: HostedRecoveryOptions): void {
  if (typeof window === 'undefined') return;

  const handler = (err: unknown, hint = '') => {
    const merged =
      err instanceof Error ? `${err.message} ${hint}` : hint || String(err ?? '');
    if (tryRecoverFromHostedChunkFailure(merged, opts)) return;
    if (hint || err) {
      console.error('[hosted chunk recovery]', hint || err);
    }
  };

  window.addEventListener('error', (ev) => {
    if (tryRecoverFromHostedChunkFailure(ev.error ?? ev.message, opts)) return;
    console.error('[global error]', ev.message, ev.error?.stack);
  });

  window.addEventListener('unhandledrejection', (ev) => {
    if (tryRecoverFromHostedChunkFailure(ev.reason, opts)) return;
    console.error('[unhandledrejection]', ev.reason);
  });

  void handler;
}

export async function recoverHostedShell(deep = false): Promise<void> {
  if (deep) {
    await unregisterServiceWorkers();
  }
  navigateWithCacheBust();
}
