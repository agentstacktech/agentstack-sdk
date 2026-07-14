/**
 * Browser fetch failure taxonomy — deploy restart / offline blips vs real faults.
 */

type AgentStackNetworkWindow = Window & {
  __agentstack_last_network_error_ts?: number;
};

/** True when the browser failed to complete fetch (not an HTTP status response). */
export function isTransientBrowserNetworkError(error: unknown): boolean {
  if (error == null) return false;
  if (typeof error === 'string') {
    return /NetworkError|Failed to fetch|Load failed|network error/i.test(error);
  }
  if (typeof error !== 'object') return false;
  const e = error as Error & { code?: string };
  if (e.name === 'AbortError') return false;
  if (e.code === 'ERR_NETWORK') return true;
  const msg = e.message ?? '';
  return (
    e.name === 'TypeError' &&
    /NetworkError when attempting to fetch|Failed to fetch|Load failed|network/i.test(msg)
  );
}

/** Record a recent transient network blip for chunk-recovery gating (host reads window). */
export function noteTransientNetworkError(): void {
  if (typeof window === 'undefined') return;
  try {
    (window as AgentStackNetworkWindow).__agentstack_last_network_error_ts = Date.now();
  } catch {
    /* ignore */
  }
}

/** Host-side: deploy restart window when API/chunk fetch failed but asset may still exist. */
export function isRecentTransientNetworkBlip(maxAgeMs = 15_000): boolean {
  if (typeof window === 'undefined') return false;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return true;
  const ts = (window as AgentStackNetworkWindow).__agentstack_last_network_error_ts;
  return typeof ts === 'number' && Date.now() - ts < maxAgeMs;
}
