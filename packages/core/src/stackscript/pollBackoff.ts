/** Bounded poll backoff for async match clients (mirrors shared/stackscript/poll_backoff.py). */

export function pollBackoffMs(attempt: number, baseMs = 200, capMs = 2000): number {
  const n = attempt < 0 ? 0 : attempt;
  return Math.min(capMs, baseMs * 2 ** Math.min(n, 4));
}

export async function pollWithBackoff<T>(opts: {
  attempt: () => Promise<T | null | undefined>;
  shouldStop: (value: T) => boolean;
  maxAttempts?: number;
  signal?: AbortSignal;
}): Promise<T | null> {
  const max = opts.maxAttempts ?? 30;
  for (let i = 0; i < max; i += 1) {
    if (opts.signal?.aborted) return null;
    const value = await opts.attempt();
    if (value != null && opts.shouldStop(value)) return value;
    await new Promise((r) => setTimeout(r, pollBackoffMs(i)));
  }
  return null;
}
