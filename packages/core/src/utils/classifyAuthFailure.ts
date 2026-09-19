/**
 * Auth / transport failure classifier — DNA timeout cascade (L3-01).
 * Shared by LoginPage, Session OS bridge, and circuit-breaker policy.
 */

export type TransportKind =
  | 'offline'
  | 'timeout'
  | 'typed_503'
  | 'unauthorized'
  | 'project_session_required'
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
  'server_busy',
  'admission_shed',
]);

export function isTypedDna503Code(
  code: string | undefined | null,
): code is TypedDna503Code {
  return !!code && TYPED_503_SET.has(code);
}

/** Load-shed / admission 503 codes — quiet console when client will retry. */
export function isTransportShed503Code(code: string | undefined | null): boolean {
  return !!code && (isTypedDna503Code(code) || BATCH_TRANSPORT_SHED_CODES.has(code));
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

function readDetailField(detail: unknown, key: string): string | undefined {
  if (detail == null || typeof detail !== 'object' || Array.isArray(detail)) {
    return undefined;
  }
  const raw = (detail as Record<string, unknown>)[key];
  return typeof raw === 'string' ? raw : undefined;
}

function readDetailCode(detail: unknown): string | undefined {
  return readDetailField(detail, 'code') ?? readDetailField(detail, 'error');
}

/** Pull api/status fields from SDK errors, fetch failures, or axios-like shapes. */
export function extractAuthErrorFields(err: unknown): {
  status?: number;
  name?: string;
  message: string;
  apiCode?: string;
  sessionMissReason?: string;
} {
  if (err == null) return { message: '' };
  if (typeof err === 'string') return { message: err };

  const e = err as ErrorShape & { sessionMissReason?: string };
  const data = e.response?.data;
  const detail = data?.detail;
  const detailCode = readDetailCode(detail);
  const apiCode =
    (typeof e.apiCode === 'string' && e.apiCode) ||
    (typeof e.code === 'string' && e.code) ||
    (typeof data?.code === 'string' && data.code) ||
    (typeof data?.error === 'string' && data.error) ||
    detailCode ||
    undefined;

  const sessionMissReason =
    (typeof e.sessionMissReason === 'string' && e.sessionMissReason) ||
    readDetailField(detail, 'reason') ||
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

  return { status, name, message, apiCode, sessionMissReason };
}

/** Backoff ladder for post-restart bootstrap / refreshUser (G-A24). */
export function sessionBootstrapRetryDelayMs(round: number): number {
  const ladder = [0, 400, 800, 1_500, 2_500];
  return ladder[Math.min(Math.max(0, round), ladder.length - 1)] ?? 2_500;
}

/** True when bootstrap should retry without clearing local auth. */
export function isTransientSessionBootstrapError(err: unknown): boolean {
  const { status, apiCode, sessionMissReason } = extractAuthErrorFields(err);
  if (status === 503 && apiCode === 'session_resolve_busy') return true;
  if (apiCode === 'session_not_found' && isTransientSessionMissReason(sessionMissReason)) {
    return true;
  }
  return isTransientSessionMissReason(apiCode);
}

const SESSION_DEATH_FRAGMENTS = [
  'session_not_found',
  'terminated',
  'session_expired',
] as const;

/** Post-restart / overload — retry before vault purge (G-A24, G-A96). */
const TRANSIENT_SESSION_MISS_REASONS = new Set([
  'absent',
  'dna_timeout',
  'hist_busy',
  'server_busy',
  'session_resolve_busy',
  'cache_epoch_stale',
]);

/** True when a session miss is likely transient (deploy recycle, L1/DNA race). */
export function isTransientSessionMissReason(reason?: string | null): boolean {
  const r = String(reason || '').toLowerCase();
  if (!r) return false;
  if (TRANSIENT_SESSION_MISS_REASONS.has(r)) return true;
  if (r.startsWith('absent')) return true;
  if (r.includes('dna_timeout')) return true;
  return false;
}

/** Client vault purge policy — shared by SDK HTTP client and Session OS bridge. */
export function shouldPurgeClientSessionOnMiss(opts: {
  reason?: string;
  inPostLoginGrace?: boolean;
}): boolean {
  if (opts.inPostLoginGrace) return false;
  if (isTransientSessionMissReason(opts.reason)) return false;
  return true;
}

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
    const { sessionMissReason } = extractAuthErrorFields(err);
    if (isTransientSessionMissReason(sessionMissReason)) {
      return false;
    }
    return true;
  }

  // LEC G-A96: overload fence — retry once; do not treat as session death.
  if (code === 'session_resolve_busy') {
    return false;
  }

  if (status === 401) {
    if (code === 'project_session_required') {
      return false;
    }
    return true;
  }

  // Permission denied — retrying cannot succeed without role change.
  if (status === 403) {
    return true;
  }

  if (MINT_BUSY_FRAGMENTS.some((frag) => code.includes(frag))) {
    return true;
  }

  if (status === 503 && isTransportShed503Code(apiCode)) {
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
    msg.includes('failed to fetch') ||
    msg.includes('fetch failed')
  ) {
    return { kind: 'offline' };
  }

  if (msg.includes('circuit breaker')) {
    return { kind: 'unknown', code: 'circuit_open' };
  }

  if (msg.includes('network error')) {
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
    if ((apiCode || '').toLowerCase() === 'project_session_required') {
      return { kind: 'project_session_required', code: apiCode || 'project_session_required' };
    }
    return { kind: 'unauthorized', code: apiCode };
  }

  if (status === 503 && apiCode) {
    return { kind: 'typed_503', code: apiCode };
  }

  return { kind: 'unknown', code: apiCode };
}
