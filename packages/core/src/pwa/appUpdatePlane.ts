/**
 * Static deploy probe for the Update Plane (`sdk.pwa.update_plane.gen2`).
 * Browser-only; pass `fetch` in tests.
 */

import {
  isHtmlContentType,
  isValidBuildId,
  parseBuildIdFromIndexHtml,
  parseBuildMetaJson,
  type BuildMetaPayload,
} from './buildId';

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

export type ProbeStaticBuildSource =
  | 'build-id.txt'
  | 'build-meta.json'
  | 'index.html'
  | 'invalid'
  | 'none';

export type ProbeStaticBuildResult = {
  mismatch: boolean;
  remoteBuildId: string | null;
  source: ProbeStaticBuildSource;
  /** From remote build-meta.json when available. */
  remoteBuildMeta?: BuildMetaPayload | null;
};

const PROBE_BODY_MAX = 256;

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
  let sawInvalid = false;

  const txtResult = await probeBuildIdFile(doFetch, `${base}build-id.txt`, timeout, 'build-id.txt');
  if (txtResult.kind === 'ok') {
    return finalizeProbe(input.localBuildId, txtResult.remoteId, 'build-id.txt');
  }
  if (txtResult.kind === 'invalid') sawInvalid = true;

  const metaResult = await probeBuildMetaFile(doFetch, `${base}build-meta.json`, timeout);
  if (metaResult.kind === 'ok') {
    return finalizeProbe(input.localBuildId, metaResult.meta.buildId, 'build-meta.json', metaResult.meta);
  }
  if (metaResult.kind === 'invalid') sawInvalid = true;

  const htmlResult = await probeIndexHtml(doFetch, `${base}index.html`, timeout);
  if (htmlResult.kind === 'ok') {
    return finalizeProbe(input.localBuildId, htmlResult.remoteId, 'index.html');
  }
  if (htmlResult.kind === 'invalid') sawInvalid = true;

  if (sawInvalid) {
    return { mismatch: false, remoteBuildId: null, source: 'invalid' };
  }
  return { mismatch: false, remoteBuildId: null, source: 'none' };
}

type ProbeFileOk = { kind: 'ok'; remoteId: string };
type ProbeFileInvalid = { kind: 'invalid' };
type ProbeFileMiss = { kind: 'miss' };

async function probeBuildIdFile(
  doFetch: typeof fetch,
  url: string,
  timeout: number,
  _label: string,
): Promise<ProbeFileOk | ProbeFileInvalid | ProbeFileMiss> {
  try {
    const res = await doFetch(url, {
      cache: 'no-store',
      credentials: 'same-origin',
      signal: AbortSignal.timeout(timeout),
    });
    if (!res.ok) return { kind: 'miss' };
    if (isHtmlContentType(res.headers.get('content-type'))) {
      return { kind: 'invalid' };
    }
    const remote = (await res.text()).slice(0, PROBE_BODY_MAX).trim();
    if (!isValidBuildId(remote)) return { kind: 'invalid' };
    return { kind: 'ok', remoteId: remote };
  } catch {
    return { kind: 'miss' };
  }
}

async function probeBuildMetaFile(
  doFetch: typeof fetch,
  url: string,
  timeout: number,
): Promise<{ kind: 'ok'; meta: BuildMetaPayload } | ProbeFileInvalid | ProbeFileMiss> {
  try {
    const res = await doFetch(url, {
      cache: 'no-store',
      credentials: 'same-origin',
      signal: AbortSignal.timeout(timeout),
    });
    if (!res.ok) return { kind: 'miss' };
    if (isHtmlContentType(res.headers.get('content-type'))) {
      return { kind: 'invalid' };
    }
    const text = (await res.text()).slice(0, PROBE_BODY_MAX * 4);
    const meta = parseBuildMetaJson(text);
    if (!meta) return { kind: 'invalid' };
    return { kind: 'ok', meta };
  } catch {
    return { kind: 'miss' };
  }
}

async function probeIndexHtml(
  doFetch: typeof fetch,
  url: string,
  timeout: number,
): Promise<ProbeFileOk | ProbeFileInvalid | ProbeFileMiss> {
  try {
    const res = await doFetch(url, {
      cache: 'no-store',
      credentials: 'same-origin',
      signal: AbortSignal.timeout(timeout),
    });
    if (!res.ok) return { kind: 'miss' };
    const html = (await res.text()).slice(0, 8192);
    const remote = parseBuildIdFromIndexHtml(html);
    if (!remote) return { kind: 'invalid' };
    return { kind: 'ok', remoteId: remote };
  } catch {
    return { kind: 'miss' };
  }
}

function finalizeProbe(
  localBuildId: string,
  remoteBuildId: string,
  source: Exclude<ProbeStaticBuildSource, 'invalid' | 'none'>,
  remoteBuildMeta?: BuildMetaPayload | null,
): ProbeStaticBuildResult {
  return {
    mismatch: remoteBuildId !== localBuildId,
    remoteBuildId,
    source,
    remoteBuildMeta: remoteBuildMeta ?? null,
  };
}

/** @deprecated use parseBuildIdFromIndexHtml from `./buildId` */
export { parseBuildIdFromIndexHtml } from './buildId';

export function parseBuildIdFromIndexHtmlLegacy(html: string): string | null {
  return parseBuildIdFromIndexHtml(html);
}

function normalizeBaseUrl(base: string): string {
  let b = (base ?? '/').trim();
  if (!b.startsWith('/')) b = `/${b}`;
  if (!b.endsWith('/')) b += '/';
  return b;
}
