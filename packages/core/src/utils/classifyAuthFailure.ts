/**
 * Auth / transport failure classifier — DNA timeout cascade (L3-01).
 * Shared by LoginPage, Session OS bridge, and circuit-breaker policy.
 */

export type TransportKind =
  | 'offline'
  | 'timeout'
  | 'typed_503'
  | 'unauthorized'
  | 'unknown';

/** Typed HTTP 503 codes from DNA admission / auth mint paths. */
export const TYPED_DNA_503_CODES = [
  'dna_timeout',
  'auth_me_db_timeout',
  'project_key_unavailable',
  'auth_mint_in_progress',
  'dna_overloaded',
  'auth_mint_timeout',
] as const;

export type TypedDna503Code = (typeof TYPED_DNA_503_CODES)[number];

const TYPED_503_SET = new Set<string>(TYPED_DNA_503_CODES);

/** Batch gateway shed codes (coalesced with typed 503 policy). */
export const BATCH_TRANSPORT_SHED_CODES = new Set([
  'batch_sub_timeout',
  'dna_overloaded',
]);

export function isTypedDna503Code(
  code: string | undefined | null,
): code is TypedDna503Code {
  return !!code && TYPED_503_SET.has(code);
}

type ErrorShape = {
  status?: number;
  name?: string;
  message?: string;
  code?: string;
  apiCode?: string;
  response?: {
    status?: number;
    data?: {
      code?: string;
      error?: string;
      detail?: unknown;
    };
  };
};

function readDetailCode(detail: unknown): string | undefined {
  if (detail == null || typeof detail !== 'object' || Array.isArray(detail)) {
    return undefined;
  }
  const o = detail as Record<string, unknown>;
  if (typeof o.code === 'string') return o.code;
  if (typeof o.error === 'string') return o.error;
  return undefined;
}

/** Pull api/status fields from SDK errors, fetch failures, or axios-like shapes. */
export function extractAuthErrorFields(err: unknown): {
  status?: number;
  name?: string;
  message: string;
  apiCode?: string;
} {
  if (err == null) return { message: '' };
  if (typeof err === 'string') return { message: err };

  const e = err as ErrorShape;
  const data = e.response?.data;
  const detailCode = readDetailCode(data?.detail);
  const apiCode =
    (typeof e.apiCode === 'string' && e.apiCode) ||
    (typeof e.code === 'string' && e.code) ||
    (typeof data?.code === 'string' && data.code) ||
    (typeof data?.error === 'string' && data.error) ||
    detailCode ||
    undefined;

  const status =
    (typeof e.status === 'number' ? e.status : undefined) ??
    (typeof e.response?.status === 'number' ? e.response.status : undefined);

  const name =
    (typeof e.name === 'string' && e.name) ||
    (err instanceof Error ? err.constructor.name : undefined);

  const message =
    (typeof e.message === 'string' && e.message) ||
    (err instanceof Error ? err.message : '') ||
    '';

  return { status, name, message, apiCode };
}

const SESSION_DEATH_FRAGMENTS = [
  'session_not_found',
  'terminated',
  'session_expired',
] as const;

const MINT_BUSY_FRAGMENTS = [
  'auth_mint_in_progress',
  'project_key_unavailable',
  'auth_mint_timeout',
] as const;

/**
 * RQ / poll shed gate — typed DNA 503, session death, mint-busy.
 * Do not retry these; they amplify admission load under cascade.
 */
export function isNonRetryableAuthOrShed(err: unknown): boolean {
  const { status, apiCode } = extractAuthErrorFields(err);
  const code = (apiCode || '').toLowerCase();

  if (apiCode && isTypedDna503Code(apiCode)) {
    return true;
  }

  if (SESSION_DEATH_FRAGMENTS.some((frag) => code.includes(frag))) {
    return true;
  }

  // LEC G-A96: overload fence — retry once; do not treat as session death.
  if (code === 'session_resolve_busy') {
    return false;
  }

  if (status === 401) {
    return true;
  }

  if (MINT_BUSY_FRAGMENTS.some((frag) => code.includes(frag))) {
    return true;
  }

  if (
    status === 503 &&
    (code.includes('mint') ||
      code.includes('project_key') ||
      code.includes('unavailable'))
  ) {
    return true;
  }

  return false;
}

export function classifyAuthFailure(
  err: unknown,
): { kind: TransportKind; code?: string } {
  const { status, name, message, apiCode } = extractAuthErrorFields(err);
  const msg = message.toLowerCase();
  const errCode = (err as { code?: string })?.code;

  if (
    name === 'NetworkError' ||
    errCode === 'ERR_NETWORK' ||
    msg.includes('network error') ||
    msg.includes('failed to fetch') ||
    msg.includes('fetch failed')
  ) {
    return { kind: 'offline' };
  }

  if (
    name === 'TimeoutError' ||
    errCode === 'ECONNABORTED' ||
    msg.includes('timeout') ||
    msg.includes('timed out')
  ) {
    return { kind: 'timeout' };
  }

  if (apiCode && isTypedDna503Code(apiCode)) {
    return { kind: 'typed_503', code: apiCode };
  }

  if (
    status === 401 ||
    name === 'UnauthorizedError' ||
    name === 'PermissionError' ||
    msg.includes('unauthorized') ||
    msg.includes('invalid credentials') ||
    msg.includes('неверн')
  ) {
    return { kind: 'unauthorized', code: apiCode };
  }

  if (status === 503 && apiCode) {
    return { kind: 'typed_503', code: apiCode };
  }

  return { kind: 'unknown', code: apiCode };
}
