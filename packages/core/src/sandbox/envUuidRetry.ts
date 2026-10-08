/**
 * Stale sandbox env_uuid retry — mirrors generation middleware KISS
 * (`core.generation_flow.gen1` · `generation_middleware.py`).
 * Genetic tag: core.sandbox.generation.gen1
 */

import { ServerError } from '../types/shared/HTTPTypes';

export const GENERATION_PREFERRED_ENV_BLOCKED = 'generation_preferred_env_blocked';

export type SandboxEnvUuidRetryOptions = {
  /** Clear sticky client env (HTTPClient sandboxEnv / session) before retry. */
  onStaleEnv?: () => void;
};

const ENV_KEYS = ['env_uuid', 'generation_env_uuid'] as const;

const SANDBOX_LIMIT_CODES = new Set(['sandbox_not_available', 'sandbox_limit_exceeded']);

function extractErrorHaystack(error: unknown): string {
  if (!error || typeof error !== 'object') return '';
  const err = error as {
    error_code?: string;
    code?: string;
    message?: string;
    apiCode?: string;
    response?: { data?: Record<string, unknown> };
  };

  const parts: string[] = [];
  if (typeof err.error_code === 'string') parts.push(err.error_code);
  if (err instanceof ServerError) {
    if (typeof err.apiCode === 'string') parts.push(err.apiCode);
    if (typeof err.message === 'string') parts.push(err.message);
  }
  if (typeof err.code === 'string') parts.push(err.code);

  const data = err.response?.data;
  if (data) {
    for (const key of ['error_code', 'error', 'message'] as const) {
      if (typeof data[key] === 'string') parts.push(data[key] as string);
    }
    const detail = data.detail;
    if (typeof detail === 'string') parts.push(detail);
    if (detail && typeof detail === 'object' && !Array.isArray(detail)) {
      const row = detail as Record<string, unknown>;
      if (typeof row.error_code === 'string') parts.push(row.error_code);
      if (typeof row.error === 'string') parts.push(row.error);
      if (typeof row.message === 'string') parts.push(row.message);
    }
  }
  if (typeof err.message === 'string') parts.push(err.message);
  return parts.join(' ').toLowerCase();
}

function isSandboxLimitHaystack(hay: string): boolean {
  for (const code of SANDBOX_LIMIT_CODES) {
    if (hay.includes(code)) return true;
  }
  return false;
}

/** True when explicit env_uuid is stale (not found / not open). */
export function isStaleEnvUuidError(error: unknown): boolean {
  const hay = extractErrorHaystack(error);
  if (!hay || isSandboxLimitHaystack(hay)) return false;
  if (hay.includes(GENERATION_PREFERRED_ENV_BLOCKED)) return true;
  if (
    hay.includes('preferred generation env') &&
    (hay.includes('not found') || hay.includes('not open'))
  ) {
    return true;
  }
  return false;
}

/** Strip sandbox env keys from MCP/REST params before a headless retry. */
export function omitSandboxEnvKeys<T extends Record<string, unknown>>(params: T): T {
  const out = { ...params };
  for (const key of ENV_KEYS) {
    if (key in out) delete out[key];
  }
  return out;
}

/** Frontend alias — same as omitSandboxEnvKeys (DRY with SPA helper). */
export const omitEnvUuid = omitSandboxEnvKeys;

function paramsHadEnv(params: Record<string, unknown>): boolean {
  return ENV_KEYS.some((key) => Boolean(String(params[key] ?? '').trim()));
}

/**
 * Call once with params (may include env_uuid); on stale env error clear and retry once.
 */
export async function callWithEnvUuidRetry<
  TParams extends Record<string, unknown>,
  TResult,
>(
  call: (params: TParams) => Promise<TResult>,
  params: TParams,
  options?: SandboxEnvUuidRetryOptions,
): Promise<TResult> {
  const hadEnv = paramsHadEnv(params);
  try {
    return await call(params);
  } catch (error) {
    if (!hadEnv || !isStaleEnvUuidError(error)) throw error;
    options?.onStaleEnv?.();
    return await call(omitSandboxEnvKeys(params));
  }
}
