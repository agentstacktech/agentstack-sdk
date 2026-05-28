/**
 * Static deploy probe for the Update Plane (`sdk.pwa.update_plane.gen1`).
 * Browser-only; pass `fetch` in tests.
 */

export type AppUpdateCoreReason = 'deploy' | 'build_id' | 'sw_waiting' | 'stale_assets';

/** Core reasons plus optional hosted `tenant:<id>` slot (e.g. CardGame catalog). */
export type AppUpdateReason = AppUpdateCoreReason | `tenant:${string}`;

export function isCoreAppUpdateReason(reason: AppUpdateReason): reason is AppUpdateCoreReason {
  return reason === 'deploy' || reason === 'build_id' || reason === 'sw_waiting' || reason === 'stale_assets';
}

export type ProbeStaticBuildInput = {
  baseUrl: string;
  localBuildId: string;
  fetch?: typeof fetch;
  probeTimeoutMs?: number;
};

export type ProbeStaticBuildResult = {
  mismatch: boolean;
  remoteBuildId: string | null;
  source: 'build-id.txt' | 'index.html' | 'none';
};

const BUILD_ID_HTML_RE = /VITE_APP_BUILD_ID["'\s:]+([^\s"']+)/;

/**
 * Compare origin `build-id.txt` (or embedded id in `index.html`) with the running bundle id.
 */
const PROBE_CACHE_TTL_MS = 45_000;
let probeCache: {
  localBuildId: string;
  at: number;
  result: ProbeStaticBuildResult;
} | null = null;

/** In-memory TTL cache — stale-while-revalidate for resume storms (`sdk.pwa.update_plane.gen2`). */
export async function probeStaticBuildMismatch(
  input: ProbeStaticBuildInput,
): Promise<ProbeStaticBuildResult> {
  const now = Date.now();
  if (
    probeCache &&
    probeCache.localBuildId === input.localBuildId &&
    now - probeCache.at < PROBE_CACHE_TTL_MS
  ) {
    return probeCache.result;
  }
  const result = await probeStaticBuildMismatchUncached(input);
  probeCache = { localBuildId: input.localBuildId, at: now, result };
  return result;
}

export function clearProbeStaticBuildCache(): void {
  probeCache = null;
}

async function probeStaticBuildMismatchUncached(
  input: ProbeStaticBuildInput,
): Promise<ProbeStaticBuildResult> {
  const doFetch = input.fetch ?? fetch;
  const base = normalizeBaseUrl(input.baseUrl);
  const timeout = input.probeTimeoutMs ?? 8000;

  try {
    const res = await doFetch(`${base}build-id.txt`, {
      cache: 'no-store',
      credentials: 'same-origin',
      signal: AbortSignal.timeout(timeout),
    });
    if (res.ok) {
      const remote = (await res.text()).trim();
      return {
        mismatch: Boolean(remote && remote !== input.localBuildId),
        remoteBuildId: remote || null,
        source: 'build-id.txt',
      };
    }
  } catch {
    /* fall through to index.html */
  }

  try {
    const htmlRes = await doFetch(`${base}index.html`, {
      cache: 'no-store',
      credentials: 'same-origin',
      signal: AbortSignal.timeout(timeout),
    });
    if (!htmlRes.ok) {
      return { mismatch: false, remoteBuildId: null, source: 'none' };
    }
    const html = await htmlRes.text();
    const remote = html.match(BUILD_ID_HTML_RE)?.[1]?.trim() ?? '';
    return {
      mismatch: Boolean(remote && remote !== input.localBuildId),
      remoteBuildId: remote || null,
      source: 'index.html',
    };
  } catch {
    return { mismatch: false, remoteBuildId: null, source: 'none' };
  }
}

export function parseBuildIdFromIndexHtml(html: string): string | null {
  return html.match(BUILD_ID_HTML_RE)?.[1]?.trim() ?? null;
}

function normalizeBaseUrl(base: string): string {
  let b = (base ?? '/').trim();
  if (!b.startsWith('/')) b = `/${b}`;
  if (!b.endsWith('/')) b += '/';
  return b;
}
