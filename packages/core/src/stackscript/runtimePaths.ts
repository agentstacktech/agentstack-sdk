/** DNA runtime path helpers (mirrors shared/atoms/stackscript_runtime_paths.py). */

export const RUNTIME_SEGMENTS = ['ecosystem', 'scripts', 'runtime'] as const;

export function normalizeRuntimeWritePath(segments: string[]): string[] {
  if (!segments.length) return [...RUNTIME_SEGMENTS];
  if (
    segments.length >= 3 &&
    segments[0] === 'ecosystem' &&
    segments[1] === 'scripts'
  ) {
    return segments.map(String);
  }
  if (segments.length >= 2 && segments[0] === 'stackscript' && segments[1] === 'host') {
    return [...RUNTIME_SEGMENTS, ...segments.slice(2).map(String)];
  }
  return [...RUNTIME_SEGMENTS, ...segments.map(String)];
}

export function matchRuntimePrefix(matchId: string, leaf: string): string {
  return `ecosystem.scripts.runtime.${matchId}.${leaf}`;
}

export function pathAllowedForWrite(dotPath: string, allowed: string[]): boolean {
  const norm = normalizeRuntimeWritePath(dotPath.split('.').filter(Boolean)).join('.');
  for (const raw of allowed || []) {
    const prefix = String(raw || '').trim();
    if (!prefix) continue;
    if (norm === prefix || norm.startsWith(`${prefix}.`)) return true;
  }
  return false;
}
