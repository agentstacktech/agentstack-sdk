/**
 * HTTP-related types
 */

export type HTTPMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

// Enum version for compatibility
export const HTTPMethod = {
  GET: 'GET' as const,
  POST: 'POST' as const,
  PUT: 'PUT' as const,
  DELETE: 'DELETE' as const,
  PATCH: 'PATCH' as const
};

export class BadRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BadRequestError';
  }
}

export type AuthErrorCode =
  | 'session_expired'
  | 'session_revoked'
  | 'session_not_found'
  | 'session_resolve_busy'
  | 'auth_mint_timeout'
  | 'backend_unavailable'
  | 'unauthorized'
  | 'cache_epoch_stale'
  | 'stale_jti_discarded'
  | 'project_session_required';

export class UnauthorizedError extends Error {
  public readonly status: number;
  public readonly code: AuthErrorCode;
  public readonly traceId?: string;
  /** Bearer contour miss reason from FastAPI ``detail.reason`` (G-A24). */
  public readonly sessionMissReason?: string;

  constructor(
    message: string,
    options?: {
      status?: number;
      code?: AuthErrorCode;
      traceId?: string;
      sessionMissReason?: string;
    },
  ) {
    super(message);
    this.name = 'UnauthorizedError';
    this.status = options?.status ?? 401;
    this.code = options?.code ?? 'unauthorized';
    this.traceId = options?.traceId;
    this.sessionMissReason = options?.sessionMissReason;
  }
}

export class ForbiddenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends Error {
  public response?: {
    status: number;
    data?: any;
    statusText?: string;
  };
  
  constructor(message: string, response?: { status: number; data?: any; statusText?: string }) {
    super(message);
    this.name = 'ConflictError';
    this.response = response;
  }
}

export class RateLimitError extends Error {
  public readonly status = 429;
  public readonly apiCode?: string;
  public readonly requestId?: string;
  public readonly retryAfterSec?: number;

  constructor(
    message: string,
    options?: { apiCode?: string; requestId?: string; retryAfterSec?: number },
  ) {
    super(message);
    this.name = 'RateLimitError';
    this.apiCode = options?.apiCode;
    this.requestId = options?.requestId;
    this.retryAfterSec = options?.retryAfterSec;
  }
}

export class InternalServerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InternalServerError';
  }
}

export class ServerError extends Error {
  /** Present when raised from HTTPClient for HTTP error responses (e.g. 503). */
  public readonly status?: number;
  /** JSON ``error`` / ``code`` field when API returns structured body. */
  public readonly apiCode?: string;
  /** ``request_id`` / trace from JSON body when present. */
  public readonly requestId?: string;
  /** Parsed ``Retry-After`` header seconds when present (Session OS V3.1 M5). */
  public readonly retryAfterSec?: number;

  constructor(
    message: string,
    status?: number,
    options?: { apiCode?: string; requestId?: string; retryAfterSec?: number }
  ) {
    super(message);
    this.name = 'ServerError';
    this.status = status;
    this.apiCode = options?.apiCode;
    this.requestId = options?.requestId;
    this.retryAfterSec = options?.retryAfterSec;
  }
}

/** Load-shed 503 with structured ``server_busy`` code — honor Retry-After. */
export class ServerBusyError extends ServerError {
  public readonly retryAfterMs?: number;

  constructor(
    message: string,
    status?: number,
    options?: {
      apiCode?: string;
      requestId?: string;
      retryAfterSec?: number;
      retryAfterMs?: number;
    }
  ) {
    super(message, status, options);
    this.name = 'ServerBusyError';
    this.retryAfterMs =
      options?.retryAfterMs ??
      (options?.retryAfterSec != null ? options.retryAfterSec * 1000 : undefined);
  }
}

export class TimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TimeoutError';
  }
}

export class DemoReadOnlyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DemoReadOnlyError';
  }
}

export class BudgetExceededError extends Error {
  /** API error code when present (e.g. INSUFFICIENT_BALANCE). */
  public code?: string;
  /** Full error payload for UI (FastAPI shape: detail object or wrapper). */
  public response?: {
    status: number;
    data?: any;
    statusText?: string;
  };

  constructor(
    message: string,
    options?: {
      code?: string;
      response?: { status: number; data?: any; statusText?: string };
    }
  ) {
    super(message);
    this.name = 'BudgetExceededError';
    this.code = options?.code;
    this.response = options?.response;
  }
}

export class AgentStackError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AgentStackError';
  }
}




