/**
 * MCP JSON-RPC client — POST /mcp tools/call agentstack.execute.
 * SoT wire format: genetic-ai-starter recipes/03-mcp-execute (+ busy retry from docs_site).
 * Genetic tag: repo.tooling.user_cli.gen1
 */

export interface McpStep {
  action: string;
  params?: Record<string, unknown>;
  id?: string;
}

export interface McpExecuteOptions {
  token: string;
  projectId: number;
  mcpUrl: string;
  /** Passed to agentstack.execute options when set. */
  idempotencyKey?: string;
  /** Expand recipe steps server-side (`options.recipe_id`). */
  recipeId?: string;
  stopOnError?: boolean;
  timeoutMs?: number;
  maxAttempts?: number;
}

export interface McpStepResult {
  id?: string;
  ok?: boolean;
  result?: unknown;
  error?: string;
  [key: string]: unknown;
}

export interface McpExecuteResult {
  ok: boolean;
  results: McpStepResult[];
  raw: unknown;
  error?: string;
  status?: number;
  partial_success?: boolean;
  succeeded_count?: number;
  failed_step_ids?: string[];
}

function isServerBusy(payload: unknown, status?: number): boolean {
  if (status === 503) return true;
  const text = JSON.stringify(payload ?? {}).toLowerCase();
  return text.includes('server_busy');
}

async function sleep(ms: number): Promise<void> {
  await new Promise((r) => setTimeout(r, ms));
}

/**
 * Execute one or more MCP actions via JSON-RPC `tools/call` → `agentstack.execute`.
 */
export async function mcpExecute(
  steps: McpStep[],
  opts: McpExecuteOptions,
): Promise<McpExecuteResult> {
  const argumentsBody = {
    steps: steps.map((s, i) => ({
      id: s.id ?? `step_${i}`,
      action: s.action,
      params: s.params ?? {},
    })),
    context: { project_id: Number(opts.projectId) },
    options: {
      stopOnError: opts.stopOnError !== false,
      ...(opts.idempotencyKey ? { idempotency_key: opts.idempotencyKey } : {}),
      ...(opts.recipeId ? { recipe_id: opts.recipeId } : {}),
    },
  };

  const body = {
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/call',
    params: {
      name: 'agentstack.execute',
      arguments: argumentsBody,
    },
  };

  const maxAttempts = Math.max(1, opts.maxAttempts ?? 4);
  let delayMs = 1000;
  let lastRaw: unknown = null;
  let lastStatus: number | undefined;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer =
      controller && opts.timeoutMs
        ? setTimeout(() => controller.abort(), opts.timeoutMs)
        : null;
    try {
      const res = await fetch(opts.mcpUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${opts.token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'X-Project-ID': String(opts.projectId),
        },
        body: JSON.stringify(body),
        signal: controller?.signal,
      });
      lastStatus = res.status;
      lastRaw = await res.json().catch(() => ({}));
      if (isServerBusy(lastRaw, res.status) && attempt < maxAttempts - 1) {
        await sleep(delayMs);
        delayMs = Math.min(delayMs * 2, 30_000);
        continue;
      }
      const results = extractResults(lastRaw);
      const batchMeta = extractBatchMeta(lastRaw);
      const stepsOk =
        results.length === 0 || results.every((r) => r.ok !== false && !r.error);
      const ok = res.ok && (batchMeta.partial_success === true || stepsOk);
      return {
        ok,
        results,
        raw: lastRaw,
        status: res.status,
        error: ok ? undefined : summarizeError(lastRaw, results),
        ...batchMeta,
      };
    } catch (err) {
      lastRaw = { error: err instanceof Error ? err.message : String(err) };
      if (attempt >= maxAttempts - 1) {
        return {
          ok: false,
          results: [],
          raw: lastRaw,
          error: err instanceof Error ? err.message : String(err),
        };
      }
      await sleep(delayMs);
      delayMs = Math.min(delayMs * 2, 30_000);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  return {
    ok: false,
    results: [],
    raw: lastRaw,
    status: lastStatus,
    error: 'mcp_execute_exhausted',
  };
}

function extractBatchMeta(payload: unknown): Pick<
  McpExecuteResult,
  'partial_success' | 'succeeded_count' | 'failed_step_ids'
> {
  if (!payload || typeof payload !== 'object') return {};
  const p = payload as Record<string, unknown>;
  const inner = (p.result as Record<string, unknown> | undefined) ?? p;
  const out: Pick<McpExecuteResult, 'partial_success' | 'succeeded_count' | 'failed_step_ids'> = {};
  if (typeof inner.partial_success === 'boolean') out.partial_success = inner.partial_success;
  if (typeof inner.succeeded_count === 'number') out.succeeded_count = inner.succeeded_count;
  if (Array.isArray(inner.failed_step_ids)) {
    out.failed_step_ids = inner.failed_step_ids.map((id) => String(id));
  }
  return out;
}

function extractResults(payload: unknown): McpStepResult[] {
  if (!payload || typeof payload !== 'object') return [];
  const p = payload as Record<string, unknown>;
  if (Array.isArray(p.results)) return p.results as McpStepResult[];
  const result = p.result as Record<string, unknown> | undefined;
  if (result && Array.isArray(result.results)) return result.results as McpStepResult[];
  // Some gateways wrap content as text JSON
  const content = result?.content;
  if (Array.isArray(content)) {
    for (const block of content) {
      const b = block as { text?: string; type?: string };
      if (b?.text) {
        try {
          const parsed = JSON.parse(b.text) as { results?: McpStepResult[] };
          if (Array.isArray(parsed.results)) return parsed.results;
        } catch {
          /* ignore */
        }
      }
    }
  }
  if (Array.isArray(p.steps)) {
    return (p.steps as Array<Record<string, unknown>>).map((s) => ({
      id: String(s.id ?? ''),
      ok: s.success !== false && !s.error,
      result: s.result,
      error: s.error ? String(s.error) : undefined,
    }));
  }
  return [];
}

/** True when batch completed with mixed step outcomes (server partial_success). */
export function isMcpPartialSuccess(
  result: Pick<McpExecuteResult, 'partial_success' | 'ok'>,
): boolean {
  return Boolean(result.partial_success);
}

/** Compact UI/agent summary for execute batch outcomes. */
export function summarizeMcpBatchOutcome(result: McpExecuteResult): {
  state: 'success' | 'partial_success' | 'error';
  message: string;
  succeededCount?: number;
  failedStepIds?: string[];
} {
  if (result.partial_success) {
    const n = result.succeeded_count ?? 0;
    const failed = result.failed_step_ids ?? [];
    return {
      state: 'partial_success',
      message: `Partial success: ${n} step(s) ok, ${failed.length} failed`,
      succeededCount: n,
      failedStepIds: failed,
    };
  }
  if (result.ok) {
    return { state: 'success', message: 'All steps succeeded' };
  }
  return {
    state: 'error',
    message: result.error ?? 'MCP execute failed',
    failedStepIds: result.failed_step_ids,
  };
}

function summarizeError(raw: unknown, results: McpStepResult[]): string {
  const failed = results.find((r) => r.ok === false || r.error);
  if (failed?.error) return String(failed.error);
  if (raw && typeof raw === 'object' && 'error' in raw) {
    const e = (raw as { error?: unknown }).error;
    return typeof e === 'string' ? e : JSON.stringify(e);
  }
  return 'mcp_execute_failed';
}
