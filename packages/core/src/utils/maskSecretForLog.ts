/**
 * Mask API keys, tokens, and other secrets for debug logs (never log full values).
 */

const SENSITIVE_HEADER_NAMES = new Set([
  'authorization',
  'x-api-key',
  'x-user-token',
  'cookie',
  'set-cookie'
]);

/**
 * Returns a short fingerprint: prefix…suffix (len=N). Short strings are fully redacted.
 */
export function maskSecretForLog(
  secret: string | null | undefined,
  options?: { prefixLen?: number; suffixLen?: number }
): string {
  if (secret == null) {
    return '(null)';
  }
  if (typeof secret !== 'string') {
    return maskSecretForLog(String(secret), options);
  }
  const trimmed = secret.trim();
  if (!trimmed) {
    return '(empty)';
  }
  const prefixLen = options?.prefixLen ?? 4;
  const suffixLen = options?.suffixLen ?? 4;
  const n = trimmed.length;
  const minVisible = prefixLen + suffixLen;
  if (n <= minVisible) {
    return `[REDACTED len=${n}]`;
  }
  return `${trimmed.slice(0, prefixLen)}…${trimmed.slice(-suffixLen)} (len=${n})`;
}

/**
 * Masks the bearer token in an Authorization header value.
 */
export function maskBearerAuthorizationForLog(
  header: string | null | undefined
): string {
  if (header == null || header === '') {
    return '(empty)';
  }
  const m = /^Bearer\s+(\S+)/i.exec(header.trim());
  if (m) {
    return `Bearer ${maskSecretForLog(m[1])}`;
  }
  return maskSecretForLog(header);
}

/**
 * Masks known sensitive HTTP headers; truncates long non-sensitive values.
 */
export function maskHeaderValueForLog(headerName: string, value: string): string {
  const lower = headerName.toLowerCase();
  if (SENSITIVE_HEADER_NAMES.has(lower)) {
    if (lower === 'authorization') {
      return maskBearerAuthorizationForLog(value);
    }
    return maskSecretForLog(value);
  }
  const max = 120;
  if (value.length > max) {
    return `${value.slice(0, max - 3)}...`;
  }
  return value;
}
