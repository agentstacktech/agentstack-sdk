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

export class UnauthorizedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnauthorizedError';
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
  constructor(message: string) {
    super(message);
    this.name = 'RateLimitError';
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
  /** JSON ``error`` field when API returns structured body (e.g. ``AgentCoinSchemaMissing``). */
  public readonly apiCode?: string;
  /** ``request_id`` / trace from JSON body when present. */
  public readonly requestId?: string;

  constructor(
    message: string,
    status?: number,
    options?: { apiCode?: string; requestId?: string }
  ) {
    super(message);
    this.name = 'ServerError';
    this.status = status;
    this.apiCode = options?.apiCode;
    this.requestId = options?.requestId;
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




