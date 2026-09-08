/**
 * Exit codes + error mapping.
 * 0 ok · 1 usage · 2 auth · 3 api · 4 caps
 */

export const EXIT = {
  OK: 0,
  USAGE: 1,
  AUTH: 2,
  API: 3,
  CAPS: 4,
} as const;

export function mapErrorToExit(err: unknown): number {
  const msg = err instanceof Error ? err.message : String(err);
  const lower = msg.toLowerCase();
  // USAGE before AUTH — messages like "usage: auth use-project" contain "auth"
  if (
    lower.startsWith('usage:') ||
    lower.includes('unknown command') ||
    lower.includes('must contain')
  ) {
    return EXIT.USAGE;
  }
  if (
    lower.includes('missing token') ||
    lower.includes('unauthorized') ||
    /\b401\b/.test(lower) ||
    lower.includes('no_api_key') ||
    lower.includes('device code aborted') ||
    lower.includes('access_denied')
  ) {
    return EXIT.AUTH;
  }
  if (isCapsFailure(lower)) {
    return EXIT.CAPS;
  }
  return EXIT.API;
}

/** Shared sniff for doctor + exit mapping (API key service_caps). */
export function isCapsFailure(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes('service_cap') ||
    lower.includes('service_caps') ||
    lower.includes('cap_denied')
  );
}
