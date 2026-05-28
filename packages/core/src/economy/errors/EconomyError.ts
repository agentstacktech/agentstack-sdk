import { AgentStackError } from '../../types';

export type EconomyErrorCode =
  | 'QUOTE_REQUIRED'
  | 'QUOTE_EXPIRED'
  | 'QUOTE_HASH_MISMATCH'
  | 'INSUFFICIENT_AGNT'
  | 'IDEMPOTENCY_CONFLICT'
  | 'RATE_LIMITED'
  | 'SCHEMA_MISSING'
  | 'CAP_DENIED'
  | 'FUNDING_NOT_OFFERED'
  | 'UNKNOWN';

export class EconomyError extends AgentStackError {
  constructor(
    public readonly code: EconomyErrorCode,
    message: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'EconomyError';
  }
}

export function isEconomyRateLimitError(err: unknown): boolean {
  return err instanceof EconomyError && err.code === 'RATE_LIMITED';
}

/** FastAPI ``{ detail: { code, message } }`` or legacy string detail. */
export function extractEconomyDetailCode(body: unknown): string | undefined {
  if (typeof body !== 'object' || body == null || !('detail' in body)) {
    return undefined;
  }
  const d = (body as { detail: unknown }).detail;
  if (typeof d === 'object' && d != null && 'code' in d) {
    return String((d as { code: string }).code).trim();
  }
  if (typeof d === 'string') {
    return d.trim();
  }
  return undefined;
}

function detailMessage(body: unknown): string {
  if (typeof body !== 'object' || body == null || !('detail' in body)) {
    return typeof body === 'string' ? body : '';
  }
  const d = (body as { detail: unknown }).detail;
  if (typeof d === 'object' && d != null && 'message' in d) {
    return String((d as { message: string }).message);
  }
  if (typeof d === 'string') {
    return d;
  }
  return '';
}

export function mapEconomyErrorFromHttp(status: number, body: unknown): EconomyError {
  const codeToken = extractEconomyDetailCode(body);
  const detail = detailMessage(body) || codeToken || '';

  if (status === 429) {
    return new EconomyError('RATE_LIMITED', detail || 'Economy write rate limit', { status });
  }
  if (status === 403) {
    return new EconomyError('CAP_DENIED', detail || 'Forbidden', { status });
  }
  if (status === 503 && /schema|unavailable/i.test(detail)) {
    return new EconomyError('SCHEMA_MISSING', detail, { status });
  }
  if (status === 400 || status === 422) {
    if (codeToken === 'quote_expired' || codeToken === 'quote_consumed') {
      return new EconomyError('QUOTE_EXPIRED', detail || codeToken, { status, code: codeToken });
    }
    if (codeToken === 'quote_hash' || codeToken === 'quote_hash_mismatch') {
      return new EconomyError('QUOTE_HASH_MISMATCH', detail || codeToken, { status });
    }
    if (codeToken === 'insufficient' || /insufficient/i.test(detail)) {
      return new EconomyError('INSUFFICIENT_AGNT', detail, { status });
    }
    if (codeToken === 'idempotency_conflict' || /idempotency/i.test(detail)) {
      return new EconomyError('IDEMPOTENCY_CONFLICT', detail, { status });
    }
    if (/quote_not_found|quote expired|quote_expired/i.test(detail)) {
      return new EconomyError('QUOTE_EXPIRED', detail, { status });
    }
    if (/quote_hash/i.test(detail)) {
      return new EconomyError('QUOTE_HASH_MISMATCH', detail, { status });
    }
    if (/insufficient/i.test(detail)) {
      return new EconomyError('INSUFFICIENT_AGNT', detail, { status });
    }
    if (/idempotency/i.test(detail)) {
      return new EconomyError('IDEMPOTENCY_CONFLICT', detail, { status });
    }
  }
  return new EconomyError('UNKNOWN', detail || `HTTP ${status}`, { status, body });
}
