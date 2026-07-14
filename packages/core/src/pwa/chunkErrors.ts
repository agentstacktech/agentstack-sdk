/**
 * Lazy-chunk / dynamic-import failure detection (`sdk.pwa.update_plane.gen2`).
 * Shared by host SPA, widgets, and classifyClientError.
 */

const CHUNK_ASSET_URL_RE =
  /https?:\/\/[^\s'"]+\/assets\/[A-Za-z0-9_.-]+\.(?:js|css|mjs)(?:\?[^\s'"]*)?/i;

/** Firefox/Safari + Chromium dynamic import error shapes. */
export function isChunkLikeErrorMessage(msg: string): boolean {
  const m = msg ?? '';
  return (
    /Unable to preload CSS/i.test(m) ||
    /Loading (CSS )?chunk/i.test(m) ||
    /Loading chunk .* failed/i.test(m) ||
    /Failed to fetch dynamically imported module/i.test(m) ||
    /error loading dynamically imported module/i.test(m) ||
    /Importing a module script failed/i.test(m) ||
    /failed to (fetch|load) module script/i.test(m)
  );
}

/** Extract hashed `/assets/*` URL from dynamic-import error text. */
export function extractChunkAssetUrl(msg: string): string | null {
  const m = (msg ?? '').match(CHUNK_ASSET_URL_RE);
  return m?.[0] ?? null;
}

export type ChunkAssetProbeResult = 'missing' | 'present' | 'transient';

/**
 * Distinguish stale/missing hashed assets from deploy-restart network blips.
 * `transient` = fetch failed or non-404 error; do not burn chunk-recovery budget.
 */
export async function probeChunkAssetAvailability(
  url: string,
  timeoutMs = 4000,
): Promise<ChunkAssetProbeResult> {
  if (typeof fetch === 'undefined') return 'transient';
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: 'GET',
      cache: 'no-store',
      credentials: 'same-origin',
      redirect: 'follow',
      signal: ac.signal,
    });
    if (res.status === 404) return 'missing';
    if (!res.ok) return 'transient';
    const contentType = (res.headers.get('content-type') || '').toLowerCase();
    if (/text\/html/i.test(contentType)) return 'missing';
    if (
      /\.(?:js|mjs|css)(?:\?|$)/i.test(url) &&
      !/(javascript|ecmascript|module|text\/css)/i.test(contentType)
    ) {
      const head = (await res.clone().text()).trimStart().slice(0, 64).toLowerCase();
      if (head.startsWith('<!doctype') || head.startsWith('<html')) return 'missing';
    }
    return 'present';
  } catch {
    return 'transient';
  } finally {
    clearTimeout(timer);
  }
}
