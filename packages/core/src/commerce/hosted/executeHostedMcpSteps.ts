/**
 * Hosted storefront MCP batch transport (`POST /s/{pid}/mcp`).
 * Gene: sdk.commerce.hosted.gen1
 */
import type { HTTPClient } from '../../client/http-client';
import {
  listMcpBatchSteps,
  mcpStepData,
  mcpStepFailed,
  type McpStepLike,
  unwrapMcpBatchStepData,
} from '../../mcp/batchStepData';
import { hostedMcpBatchBody } from '../../mcp/hostedMcpBatchBody';
import { resolveHostedMcpUrl } from '../../mcp/urls';
import {
  hostedMcpCookieMinted,
  mintHostedAppSession,
} from './hostedAppSession';
import { mapHostedMcpPlayerError } from './hostedMcpPlayerError';

export type HostedMcpStepSpec = {
  id: string;
  action: string;
  params: Record<string, unknown>;
};

export type ExecuteHostedMcpStepsOptions = {
  hostedApiBase?: string;
  signal?: AbortSignal;
  pickStepId: string;
  /** Mint hosted_app cookie when Bearer present and not yet minted (default true). */
  mintCookieIfBearer?: boolean;
};

export type ExecuteHostedMcpStepsRetryOptions = ExecuteHostedMcpStepsOptions & {
  /** Max attempts including the first (default 3). */
  maxAttempts?: number;
  /** Cap total wait per retry (default 30_000). */
  maxRetryDelayMs?: number;
  /** Default delay when wire omits retry_after_ms (default 2500). */
  defaultRetryDelayMs?: number;
};

function throwHostedMcpStepFailure(
  step: McpStepLike | undefined,
  body: Record<string, unknown>,
): never {
  const data = mcpStepData(step);
  const merged = { body, ...body, ...data, data };
  const mapped = mapHostedMcpPlayerError(merged);
  throw Object.assign(new Error(mapped.message), {
    body: merged,
    code: mapped.code,
  });
}

function assertHostedMcpStepOk(
  raw: unknown,
  stepId: string,
): Record<string, unknown> {
  const step = listMcpBatchSteps(raw).find(
    (s) => String((s as { id?: string }).id ?? '') === stepId,
  );
  if (mcpStepFailed(step)) {
    throwHostedMcpStepFailure(step, mcpStepData(step));
  }
  const row = unwrapMcpBatchStepData(raw, stepId);
  if (row.ok === false || row.success === false) {
    throwHostedMcpStepFailure(step, row);
  }
  return row;
}

export async function executeHostedMcpSteps(
  http: HTTPClient,
  projectId: number,
  steps: HostedMcpStepSpec[],
  options: ExecuteHostedMcpStepsOptions,
): Promise<Record<string, unknown>> {
  const mint = options.mintCookieIfBearer !== false;
  const bearer = http.getAuthToken?.();
  if (mint && bearer && !hostedMcpCookieMinted(projectId)) {
    await mintHostedAppSession(projectId, bearer, {
      apiBase: options.hostedApiBase,
    });
  }
  const url = resolveHostedMcpUrl(projectId, options.hostedApiBase);
  const res = await http.post(
    url,
    hostedMcpBatchBody(
      projectId,
      steps.map((s) => ({ id: s.id, action: s.action, params: s.params })),
    ),
    {
      skipCache: true,
      signal: options.signal,
      skipAuthStateCheck: true,
      cookieSessionMcp: true,
    },
  );
  return assertHostedMcpStepOk(res, options.pickStepId);
}

function hostedMcpRetryDelayMs(err: unknown, capMs: number, fallbackMs: number): number {
  const row =
    err && typeof err === 'object' ? (err as Record<string, unknown>) : {};
  const body =
    row.body && typeof row.body === 'object' && !Array.isArray(row.body)
      ? (row.body as Record<string, unknown>)
      : row;
  const raw = body.retry_after_ms ?? row.retry_after_ms;
  const n = Number(raw);
  if (Number.isFinite(n) && n >= 0) {
    return Math.min(capMs, Math.max(0, Math.floor(n)));
  }
  return Math.min(capMs, fallbackMs);
}

function sleepMs(ms: number, signal?: AbortSignal): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }
    const timer = setTimeout(resolve, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(new DOMException('Aborted', 'AbortError'));
    };
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

/** Hosted script.run transport with db_unavailable / run_lock retry (same steps + idempotency). */
export async function executeHostedMcpStepsWithRetry(
  http: HTTPClient,
  projectId: number,
  steps: HostedMcpStepSpec[],
  options: ExecuteHostedMcpStepsRetryOptions,
): Promise<Record<string, unknown>> {
  const maxAttempts = Math.max(1, options.maxAttempts ?? 3);
  const maxRetryDelayMs = options.maxRetryDelayMs ?? 30_000;
  const defaultRetryDelayMs = options.defaultRetryDelayMs ?? 2500;
  let last: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await executeHostedMcpSteps(http, projectId, steps, options);
    } catch (err) {
      last = err;
      const mapped = mapHostedMcpPlayerError(err);
      const retryable =
        mapped.recoverable &&
        [
          'db_unavailable',
          'run_in_progress',
          'run_lock_timeout',
          'revision_prefetch_failed',
        ].includes(mapped.code);
      if (!retryable || attempt >= maxAttempts) {
        throw err;
      }
      const delay = hostedMcpRetryDelayMs(err, maxRetryDelayMs, defaultRetryDelayMs);
      await sleepMs(delay, options.signal);
    }
  }
  throw last;
}
