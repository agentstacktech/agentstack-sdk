/**
 * Build id validation atom (`sdk.pwa.update_plane.gen2`).
 * Single source of truth for probe, index.html meta parse, CI, and vite self-check.
 */

/** Allowed platform SPA build id shape (version-sha, dev-*, timestamp suffix). */
export const BUILD_ID_RE = /^[A-Za-z0-9][A-Za-z0-9._+-]{0,63}$/;

const BUILD_ID_META_RE =
  /<meta\s+name=["']agentstack:build-id["']\s+content=["']([^"']+)["']/i;

const LEGACY_BUILD_ID_HTML_RE = /VITE_APP_BUILD_ID["'\s:]+([^\s"']+)/;

const MAX_BUILD_ID_LEN = 64;

/**
 * True when `s` looks like a platform build id (not HTML, not empty, bounded length).
 */
export function isValidBuildId(s: string | null | undefined): s is string {
  if (!s) return false;
  const t = s.trim();
  if (t.length === 0 || t.length > MAX_BUILD_ID_LEN) return false;
  if (t.includes('<') || t.includes('>')) return false;
  return BUILD_ID_RE.test(t);
}

/** Parse build id from served index.html (meta tag preferred, legacy regex fallback). */
export function parseBuildIdFromIndexHtml(html: string): string | null {
  const meta = html.match(BUILD_ID_META_RE)?.[1]?.trim();
  if (isValidBuildId(meta)) return meta;
  const legacy = html.match(LEGACY_BUILD_ID_HTML_RE)?.[1]?.trim();
  if (isValidBuildId(legacy)) return legacy;
  return null;
}

/** Parse `.buildId` from build-meta.json body. */
export function parseBuildIdFromMetaJson(jsonText: string): string | null {
  try {
    const parsed = JSON.parse(jsonText) as { buildId?: unknown };
    const id = typeof parsed.buildId === 'string' ? parsed.buildId.trim() : '';
    return isValidBuildId(id) ? id : null;
  } catch {
    return null;
  }
}

export type BuildMetaPayload = {
  buildId: string;
  builtAt: string;
  gitSha: string | null;
  coreVersion: string;
  minSupportedBuildId: string | null;
};

export function parseBuildMetaJson(jsonText: string): BuildMetaPayload | null {
  try {
    const parsed = JSON.parse(jsonText) as Partial<BuildMetaPayload>;
    if (!isValidBuildId(parsed.buildId)) return null;
    return {
      buildId: parsed.buildId.trim(),
      builtAt: typeof parsed.builtAt === 'string' ? parsed.builtAt : '',
      gitSha: typeof parsed.gitSha === 'string' ? parsed.gitSha : null,
      coreVersion: typeof parsed.coreVersion === 'string' ? parsed.coreVersion : '',
      minSupportedBuildId: isValidBuildId(parsed.minSupportedBuildId)
        ? parsed.minSupportedBuildId.trim()
        : null,
    };
  } catch {
    return null;
  }
}

/** Reject responses that look like SPA shell HTML rather than a plain build id file. */
export function isHtmlContentType(contentType: string | null | undefined): boolean {
  return /text\/html/i.test(contentType ?? '');
}

/**
 * Compare build ids for force-update floor (timestamp suffix `t<number>` or ISO builtAt).
 * Returns true when `local` is strictly older than `minSupported`.
 */
export function isBuildIdBelowMinSupported(
  localBuildId: string,
  minSupportedBuildId: string | null | undefined,
  localBuiltAt?: string | null,
  minBuiltAt?: string | null,
): boolean {
  if (!isValidBuildId(minSupportedBuildId) || minSupportedBuildId === localBuildId) {
    return false;
  }
  if (localBuiltAt && minBuiltAt) {
    const localMs = Date.parse(localBuiltAt);
    const minMs = Date.parse(minBuiltAt);
    if (!Number.isNaN(localMs) && !Number.isNaN(minMs)) {
      return localMs < minMs;
    }
  }
  const localTs = extractTimestampSuffix(localBuildId);
  const minTs = extractTimestampSuffix(minSupportedBuildId);
  if (localTs != null && minTs != null) {
    return localTs < minTs;
  }
  return localBuildId.localeCompare(minSupportedBuildId) < 0;
}

function extractTimestampSuffix(buildId: string): number | null {
  const m = buildId.match(/t(\d{10,})$/);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : null;
}
