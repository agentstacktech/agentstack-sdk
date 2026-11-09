/**
 * MCP JSON-RPC client — POST /mcp tools/call agentstack.execute.
 * SoT wire format: genetic-ai-starter recipes/03-mcp-execute (+ busy retry from docs_site).
 * Genetic tag: repo.tooling.user_cli.gen1
 */

import { canonicalMcpAction } from './mcpActionAliases.generated';
import { stepNeedsSemanticAnchor } from './batchParamAnchorEval';
import { MCP_WORK_GRAPH_HOIST_KEYS, normalizeMcpWorkGraphPayload } from './workGraphHoist';

export interface McpStep {
  action: string;
  params?: Record<string, unknown>;
  id?: string;
}

export interface McpExecuteOptions {
  token: string;
  /** Omitted for ecosystem-scoped discovery reads (context.project_id unset). */
  projectId?: number;
  mcpUrl: string;
  /**
   * When JWT project_id ≠ tenant workspace, call AgentAuth.switchProject (REST
   * POST /api/auth/switch-project) and pass the returned access_token here before mutate batches.
   */
  /** Passed to agentstack.execute options when set. */
  idempotencyKey?: string;
  /** Expand recipe steps server-side (`options.recipe_id`). */
  recipeId?: string;
  /** Values for recipe placeholders (`options.recipe_params`). */
  recipeParams?: Record<string, unknown>;
  /** Queue batch; poll discovery.job_status (`options.async`). */
  async?: boolean;
  /** Playbook text. The server returns instruction_packet for the current step. */
  goal?: string;
  /** Work graph node id from agents.work_next / plan_claim. */
  focusNodeId?: string;
  /** Bind batch to plan_execute / graph execution lane. */
  planExecuteMode?: boolean;
  /** V5 batch anchor: direct CRUD bootstrap or validate-only without options.goal. */
  executionIntent?: 'direct' | 'workflow' | 'validate';
  /** Structured semantic anchor (intent_id, goal_text, step_actions). */
  routedGoal?: Record<string, unknown>;
  /** Playbook progress. completed_steps holds step ids. */
  observed?: Record<string, unknown>;
  /** Server session id from the previous envelope. */
  workflowRunId?: string;
  /** Wording only. The allowed action set stays the same. */
  density?: 'strict' | 'guided' | 'autonomous';
  /** One-request copy locale. Not saved on the profile. */
  locale?: 'en-US' | 'ru-RU' | 'pt-BR' | string;
  stopOnError?: boolean;
  timeoutMs?: number;
  maxAttempts?: number;
}

/** Ensure mutating batches carry options.goal when the caller omitted it. */
export function withSemanticAnchor<T extends { goal?: string }>(
  opts: T,
  goal: string,
): T {
  const trimmed = String(goal ?? '').trim();
  const existing = String(opts.goal ?? '').trim();
  if (!trimmed || existing) {
    return opts;
  }
  return { ...opts, goal: trimmed };
}

/** Authorized CRUD / validate-only batches without workflow goal text. */
export function withExecutionIntent<T extends { executionIntent?: string }>(
  opts: T,
  intent: 'direct' | 'workflow' | 'validate',
): T {
  if (opts.executionIntent) {
    return opts;
  }
  return { ...opts, executionIntent: intent };
}

/** Shorthand for authorized CRUD batches (semantic anchor). */
export function withDirectExecutionIntent<T extends { executionIntent?: string }>(
  opts: T,
): T {
  return withExecutionIntent(opts, 'direct');
}

function paramTruthy(val: unknown): boolean {
  return val === true || val === 'true' || val === 1 || val === '1';
}

function paramFalsey(val: unknown): boolean {
  return val === false || val === 'false' || val === 0 || val === '0';
}

function batchHasSemanticAnchor(opts: McpExecuteOptions): boolean {
  return Boolean(
    opts.executionIntent ||
      String(opts.goal ?? '').trim() ||
      String(opts.focusNodeId ?? '').trim() ||
      opts.planExecuteMode ||
      (opts.routedGoal && Object.keys(opts.routedGoal).length > 0),
  );
}

function ensureDirectExecutionIntentForBatch(
  steps: McpStep[],
  opts: McpExecuteOptions,
): McpExecuteOptions {
  const hasAnchor = batchHasSemanticAnchor(opts);
  if (hasAnchor) {
    return opts;
  }
  for (const step of steps) {
    const action = canonicalActionForBatchAnchor(String(step?.action ?? '').trim());
    if (action && stepNeedsSemanticAnchor(action, step.params ?? {})) {
      return withDirectExecutionIntent(opts);
    }
  }
  return opts;
}

function canonicalActionForBatchAnchor(action: string): string {
  return canonicalMcpAction(action);
}

/** DRY batch anchor for single-step param-sensitive mutates (mirrors server audit_batch_policy). */
export function ensureBatchSemanticAnchor(
  steps: McpStep[],
  opts: McpExecuteOptions,
): McpExecuteOptions {
  if (steps.length !== 1) {
    return opts;
  }
  const step = steps[0];
  const action = canonicalActionForBatchAnchor(String(step?.action ?? '').trim());
  if (!action) {
    return opts;
  }
  const hasAnchor = batchHasSemanticAnchor(opts);
  if (hasAnchor) {
    return opts;
  }
  const params = step.params ?? {};
  if (action === 'agents.work_next' && paramTruthy(params.claim)) {
    return withExecutionIntent(opts, 'direct');
  }
  if (action === 'agents.ensure_agent' && paramTruthy(params.create)) {
    return withExecutionIntent(opts, 'direct');
  }
  if (action === 'hosting.bucket.files.bulk_delete') {
    return withExecutionIntent(opts, 'direct');
  }
  return opts;
}

export interface McpStepResult {
  id?: string;
  ok?: boolean;
  result?: unknown;
  error?: string;
  [key: string]: unknown;
}

export type WorkflowDiagnostic = {
  code?: string;
  severity?: 'warning' | 'error' | string;
  reason?: string;
  action?: string;
};

import { goalVerificationFromEnvelope, type GoalVerificationWire } from './goalVerificationWire';

export type { GoalVerificationWire } from './goalVerificationWire';
export {
  goalVerificationFromEnvelope,
  normalizeGoalVerificationWire,
} from './goalVerificationWire';

/** Mirrors Python ``StepCompletionResult`` (three-lane workflow envelope). */
export type StepCompletionResult = {
  step_id?: string;
  completed?: boolean;
  reason?: string;
  evidence_receipt_ids?: string[];
  revision_before?: number;
  revision_after?: number;
};

export type WorkflowCompletion = {
  advanced?: boolean;
  workflow_revision?: number;
  receipt_recorded?: boolean;
  step_completion?: boolean;
  execution_advanced?: boolean;
  step_completion_result?: StepCompletionResult;
  workflow_run_id?: string;
  workflow_diagnostics?: WorkflowDiagnostic[];
  goal_verification?: GoalVerificationWire;
};

/** Pointer stamped on agentstack.execute batch root (result.v1). */
export type AgentOsCard = {
  session: string;
  batch: string;
  result: string;
  catalog: string;
  follow?: 'next_step';
};

export interface McpInstructionSliceWire {
  when_to_use?: string;
  when_blocked?: Record<string, string>;
  verify?: string[];
  rollback?: string[];
  effect?: Record<string, unknown>;
}

export interface McpExecuteResult {
  ok: boolean;
  results: McpStepResult[];
  raw: unknown;
  agent_os?: AgentOsCard;
  error?: string;
  status?: number;
  error_code?: string;
  workflow_status?: string;
  partial_success?: boolean;
  succeeded_count?: number;
  failed_step_ids?: string[];
  /** Batch / step trace ids from MCP envelope (FlowReceipt handoff). */
  trace_ids?: string[];
  workflow_diagnostics?: WorkflowDiagnostic[];
  workflow_completion?: WorkflowCompletion;
  goal_verification?: GoalVerificationWire;
  instruction_slice?: McpInstructionSliceWire;
}

/** MCP step result_kind values that mean work is not executable despite transport ok. */
export const WORK_GRAPH_BLOCK_RESULT_KINDS = new Set([
  'work_graph_blocked',
  'work_graph_waiting',
]);

export function isWorkGraphBlockResultKind(kind: unknown): boolean {
  return typeof kind === 'string' && WORK_GRAPH_BLOCK_RESULT_KINDS.has(kind);
}

/** Scan agentstack.execute envelope steps for work_graph_* result_kind. */
function stepDataRecord(step: Record<string, unknown>): Record<string, unknown> | null {
  const result = step.result;
  if (result && typeof result === 'object') {
    const data = (result as Record<string, unknown>).data;
    if (data && typeof data === 'object') return data as Record<string, unknown>;
    return result as Record<string, unknown>;
  }
  const data = step.data;
  return data && typeof data === 'object' ? (data as Record<string, unknown>) : null;
}

export function batchEnvelopeHasWorkGraphBlock(root: unknown): boolean {
  if (!root || typeof root !== 'object') return false;
  const rec = root as Record<string, unknown>;
  const steps = Array.isArray(rec.steps) ? rec.steps : [];
  for (const rawStep of steps) {
    if (!rawStep || typeof rawStep !== 'object') continue;
    const step = rawStep as Record<string, unknown>;
    if (isWorkGraphBlockResultKind(step.result_kind)) return true;
    const data = stepDataRecord(step);
    if (data) {
      if (isWorkGraphBlockResultKind(data.result_kind)) return true;
      const readiness = data.action_readiness;
      if (readiness && typeof readiness === 'object') {
        const reason = String((readiness as Record<string, unknown>).blocked_reason || '');
        if (reason === 'internal_execution_error') return true;
        if ((readiness as Record<string, unknown>).can_claim === false) return true;
      }
    }
  }
  return false;
}

/** Map server partial_success / legacy aliases to UI workflow_status. */
export function normalizeWorkflowStatus(
  status: string,
  partialSuccess?: boolean,
): string {
  const s = String(status || '').trim();
  if (partialSuccess || s === 'partial_success') return 'partial';
  return s;
}

/** Merge W6 MCP batch envelope fields onto work_next packet shapes (SDK SoT). */
export function mergeExecuteEnvelopeIntoPacket<T extends Record<string, unknown>>(
  packet: T,
  batch?: Record<string, unknown> | null,
): T {
  if (!batch || typeof batch !== 'object') {
    return packet;
  }
  const out = { ...packet } as T;
  const outRec = out as Record<string, unknown>;
  if (Array.isArray(batch.workflow_diagnostics)) {
    const existing = outRec.workflow_diagnostics;
    outRec.workflow_diagnostics = Array.isArray(existing)
      ? [...existing, ...batch.workflow_diagnostics]
      : batch.workflow_diagnostics;
  }
  if (
    batch.workflow_completion &&
    typeof batch.workflow_completion === 'object' &&
    !outRec.workflow_completion
  ) {
    outRec.workflow_completion = batch.workflow_completion;
  }
  const gv = goalVerificationFromEnvelope({ ...outRec, ...batch });
  if (gv) {
    const prior = outRec.goal_verification;
    outRec.goal_verification =
      prior && typeof prior === 'object' && !Array.isArray(prior)
        ? { ...(prior as Record<string, unknown>), ...gv }
        : gv;
  }
  const runId = String(batch.workflow_run_id ?? '').trim();
  if (runId && !String(outRec.workflow_run_id ?? '').trim()) {
    outRec.workflow_run_id = runId;
  }
  if (batch.partial_success === true) {
    outRec.partial_success = true;
  }
  const slice = batch.instruction_slice;
  if (
    slice &&
    typeof slice === 'object' &&
    !Array.isArray(slice) &&
    !outRec.instruction_slice
  ) {
    outRec.instruction_slice = slice;
  }
  if (batch.error_code && !outRec.error_code) {
    outRec.error_code = batch.error_code;
  }
  for (const key of MCP_WORK_GRAPH_HOIST_KEYS) {
    if (outRec[key] === undefined && batch[key] !== undefined) {
      outRec[key] = batch[key];
    }
  }
  const agentOs = batch.agent_os;
  if (agentOs && typeof agentOs === 'object' && !Array.isArray(agentOs) && !outRec.agent_os) {
    outRec.agent_os = agentOs;
  }
  return normalizeMcpWorkGraphPayload(outRec) as T;
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
  const effectiveOpts = ensureDirectExecutionIntentForBatch(
    steps,
    ensureBatchSemanticAnchor(steps, opts),
  );
  const context: Record<string, unknown> = {};
  const pid = effectiveOpts.projectId;
  if (pid != null && Number(pid) > 0) {
    context.project_id = Number(pid);
  }
  const locale = String(effectiveOpts.locale ?? '').trim();
  if (locale) context.locale = locale;
  const argumentsBody = {
    steps: steps.map((s, i) => ({
      id: s.id ?? `step_${i}`,
      action: s.action,
      params: s.params ?? {},
    })),
    context,
    options: {
      stopOnError: effectiveOpts.stopOnError !== false,
      ...(effectiveOpts.idempotencyKey ? { idempotency_key: effectiveOpts.idempotencyKey } : {}),
      ...(effectiveOpts.recipeId ? { recipe_id: effectiveOpts.recipeId } : {}),
      ...(effectiveOpts.recipeParams ? { recipe_params: effectiveOpts.recipeParams } : {}),
      ...(effectiveOpts.async ? { async: true } : {}),
      ...(effectiveOpts.goal ? { goal: effectiveOpts.goal } : {}),
      ...(effectiveOpts.focusNodeId ? { focus_node_id: effectiveOpts.focusNodeId } : {}),
      ...(effectiveOpts.planExecuteMode ? { plan_execute_mode: effectiveOpts.planExecuteMode } : {}),
      ...(effectiveOpts.executionIntent ? { execution_intent: effectiveOpts.executionIntent } : {}),
      ...(effectiveOpts.routedGoal ? { routed_goal: effectiveOpts.routedGoal } : {}),
      ...(effectiveOpts.observed ? { observed: effectiveOpts.observed } : {}),
      ...(effectiveOpts.workflowRunId ? { workflow_run_id: effectiveOpts.workflowRunId } : {}),
      ...(effectiveOpts.density ? { density: effectiveOpts.density } : {}),
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
      const headers: Record<string, string> = {
        Authorization: `Bearer ${effectiveOpts.token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      };
      const headerPid = effectiveOpts.projectId;
      if (headerPid != null && Number(headerPid) > 0) {
        headers['X-Project-ID'] = String(Number(headerPid));
      }
      if (locale) {
        headers['Accept-Language'] = locale;
      }
      const res = await fetch(opts.mcpUrl, {
        method: 'POST',
        headers,
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
      const domainBlocked = batchEnvelopeHasWorkGraphBlock(lastRaw);
      if (domainBlocked && batchMeta.partial_success !== true) {
        batchMeta.partial_success = true;
      }
      const stepsOk =
        results.length === 0 || results.every((r) => r.ok !== false && !r.error);
      const ok =
        res.ok &&
        (batchMeta.partial_success === true || domainBlocked || stepsOk);
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

export function extractBatchMeta(payload: unknown): Pick<
  McpExecuteResult,
  | 'partial_success'
  | 'succeeded_count'
  | 'failed_step_ids'
  | 'trace_ids'
  | 'workflow_diagnostics'
  | 'workflow_completion'
  | 'goal_verification'
  | 'agent_os'
  | 'workflow_status'
  | 'instruction_slice'
  | 'error_code'
> {
  if (!payload || typeof payload !== 'object') return {};
  const p = payload as Record<string, unknown>;
  const inner = (p.result as Record<string, unknown> | undefined) ?? p;
  const out: Pick<
    McpExecuteResult,
    | 'partial_success'
    | 'succeeded_count'
    | 'failed_step_ids'
    | 'trace_ids'
    | 'workflow_diagnostics'
    | 'workflow_completion'
    | 'goal_verification'
    | 'agent_os'
    | 'workflow_status'
    | 'instruction_slice'
    | 'error_code'
  > = {};
  if (typeof inner.partial_success === 'boolean') out.partial_success = inner.partial_success;
  if (typeof inner.workflow_status === 'string') {
    out.workflow_status = normalizeWorkflowStatus(
      inner.workflow_status,
      inner.partial_success === true,
    );
  }
  if (typeof inner.error_code === 'string') out.error_code = inner.error_code;
  if (inner.instruction_slice && typeof inner.instruction_slice === 'object') {
    out.instruction_slice = inner.instruction_slice as McpInstructionSliceWire;
  }
  if (typeof inner.succeeded_count === 'number') out.succeeded_count = inner.succeeded_count;
  if (Array.isArray(inner.failed_step_ids)) {
    out.failed_step_ids = inner.failed_step_ids.map((id) => String(id));
  }
  const traceIds: string[] = [];
  if (Array.isArray(inner.trace_ids)) {
    for (const tid of inner.trace_ids) {
      if (typeof tid === 'string' && tid.trim()) traceIds.push(tid.trim());
    }
  }
  if (typeof inner.trace_id === 'string' && inner.trace_id.trim()) {
    traceIds.push(inner.trace_id.trim());
  }
  if (traceIds.length) {
    out.trace_ids = [...new Set(traceIds)];
  }
  if (Array.isArray(inner.workflow_diagnostics)) {
    out.workflow_diagnostics = inner.workflow_diagnostics as WorkflowDiagnostic[];
  }
  const topGv = inner.goal_verification;
  if (topGv && typeof topGv === 'object') {
    out.goal_verification = topGv as GoalVerificationWire;
  }
  const wc = inner.workflow_completion;
  if (wc && typeof wc === 'object') {
    out.workflow_completion = wc as WorkflowCompletion;
    const nested = (wc as WorkflowCompletion).workflow_diagnostics;
    if (!out.workflow_diagnostics && Array.isArray(nested)) {
      out.workflow_diagnostics = nested;
    }
    const wcGv = (wc as WorkflowCompletion).goal_verification;
    if (!out.goal_verification && wcGv && typeof wcGv === 'object') {
      out.goal_verification = wcGv;
    }
  }
  const aos = inner.agent_os;
  if (aos && typeof aos === 'object' && !Array.isArray(aos)) {
    out.agent_os = aos as AgentOsCard;
  }
  return out;
}

function asMcpRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

/** One step from tools/call structuredContent or `{ data, job_id }` text. */
function stepFromToolsCallRecord(rec: Record<string, unknown> | null): McpStepResult | null {
  if (!rec) return null;
  const data = asMcpRecord(rec.data);
  const payload = data ?? (rec.job_id != null ? rec : null);
  if (!payload) return null;
  return {
    ok: rec.ok !== false,
    data: payload,
    result: { data: payload },
    error: rec.error != null ? asErrorText(rec.error) || undefined : undefined,
  };
}

export function extractResults(payload: unknown): McpStepResult[] {
  if (!payload || typeof payload !== 'object') return [];
  const p = payload as Record<string, unknown>;
  if (Array.isArray(p.results)) return p.results as McpStepResult[];
  const result = p.result as Record<string, unknown> | undefined;
  if (result && Array.isArray(result.results)) return result.results as McpStepResult[];
  // Some gateways wrap content as text JSON
  const content = result?.content;
  let fromText: McpStepResult | null = null;
  if (Array.isArray(content)) {
    for (const block of content) {
      const b = block as { text?: string; type?: string };
      if (b?.text) {
        try {
          const parsed = JSON.parse(b.text) as {
            results?: McpStepResult[];
            data?: unknown;
            job_id?: unknown;
          };
          if (Array.isArray(parsed.results)) return parsed.results;
          fromText = fromText ?? stepFromToolsCallRecord(parsed);
        } catch {
          /* ignore */
        }
      }
    }
  }
  if (Array.isArray(p.steps)) {
    return (p.steps as Array<Record<string, unknown>>).map((s) => {
      const status = typeof s.status === 'string' ? s.status : undefined;
      const isError = status === 'error' || Boolean(s.error);
      const isSkipped = status === 'skipped';
      const ok =
        status === 'success' ||
        (!isError && !isSkipped && s.success !== false && !s.error);
      return {
        ...s,
        id: String(s.id ?? ''),
        ok,
        status,
        result: s.result,
        error: s.error != null ? String(s.error) : undefined,
        error_code: typeof s.error_code === 'string' ? s.error_code : undefined,
        instruction_slice: s.instruction_slice,
        capability_result: s.capability_result,
      };
    });
  }
  const structured = stepFromToolsCallRecord(asMcpRecord(result?.structuredContent));
  if (structured) {
    if (result?.isError === true) structured.ok = false;
    return [structured];
  }
  if (fromText) return [fromText];
  return [];
}

export interface InversePacket {
  step_id: string;
  allowed_actions: string[];
  text: string;
  writes_allowed: boolean;
}

export interface InverseEnvelope {
  packet: InversePacket | null;
  observed: Record<string, unknown> | null;
  workflowRunId: string;
  workflowStatus: string;
  goalVerification: GoalVerificationWire | null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function findInverseBody(payload: unknown): Record<string, unknown> | null {
  const root = asRecord(payload);
  if (!root) return null;
  const result = asRecord(root.result);
  const layers = [root, result, asRecord(result?.result)];
  for (const row of layers) {
    if (!row) continue;
    if ('instruction_packet' in row || 'next_step' in row || 'completion' in row) return row;
  }
  return null;
}

/** Read the playbook cursor from an execute JSON-RPC payload. Null packet means the graph is finished. */
export function readInverseEnvelope(raw: unknown): InverseEnvelope | null {
  const body = findInverseBody(raw);
  if (!body) return null;
  const packet = asRecord(body.instruction_packet);
  const observed = asRecord(body.observed);
  const completion = asRecord(body.completion);
  const wc = asRecord(body.workflow_completion);
  return {
    packet: packet
      ? {
          step_id: String(packet.step_id ?? ''),
          allowed_actions: Array.isArray(packet.allowed_actions)
            ? packet.allowed_actions.map((name) => String(name))
            : [],
          text: String(packet.text ?? ''),
          writes_allowed: packet.writes_allowed !== false,
        }
      : null,
    observed,
    workflowRunId: String(
      body.workflow_run_id ?? wc?.workflow_run_id ?? completion?.workflow_run_id ?? '',
    ),
    workflowStatus: normalizeWorkflowStatus(
      String(completion?.workflow_status ?? body.workflow_status ?? ''),
      body.partial_success === true,
    ),
    goalVerification: goalVerificationFromEnvelope(body),
  };
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
  if (result.partial_success || batchEnvelopeHasWorkGraphBlock(result.raw)) {
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

/**
 * Run a multi-step inverse workflow loop with stable workflowRunId + idempotency key.
 *
 * - Pass `workflowRunId` on every batch; server may mint on first goal batch when omitted.
 * - On `run_id_rebound` / `workflow_run_identity_drift`, adopt `completion.workflow_run_id`
 *   from the response for subsequent calls (return value may include `workflowRunId`).
 * - Pair with Compass / PTC recovery tasks for `plan_ops_parent_missing` after plan_patch errors.
 */
export async function runInverseWorkflowLoop(
  steps: McpStep[],
  opts: McpExecuteOptions & { workflowRunId: string },
): Promise<McpExecuteResult> {
  const runId = String(opts.workflowRunId || '').trim();
  const key =
    opts.idempotencyKey ||
    `inverse-${runId}-${steps.map((s) => s.action).join('-')}`.slice(0, 120);
  let observed = opts.observed ? { ...opts.observed } : undefined;
  const result = await mcpExecute(steps, {
    ...opts,
    workflowRunId: runId,
    idempotencyKey: key,
    observed,
  });
  const env = readInverseEnvelope(result.raw);
  if (env?.observed && typeof env.observed === 'object') {
    observed = env.observed as Record<string, unknown>;
  }
  let workflowRunId = runId;
  const body = findInverseBody(result.raw);
  const completion = body ? asRecord(body.completion) : null;
  const reboundId = String(
    completion?.workflow_run_id ?? body?.workflow_run_id ?? env?.workflowRunId ?? '',
  ).trim();
  const warnings = Array.isArray(completion?.warnings)
    ? (completion!.warnings as unknown[])
    : [];
  const reboundWarning = warnings.some(
    (w) =>
      w === 'run_id_rebound' ||
      (typeof w === 'object' &&
        w !== null &&
        (w as { code?: string }).code === 'workflow_run_identity_drift'),
  );
  if (reboundId && (reboundWarning || !workflowRunId)) {
    workflowRunId = reboundId;
  }
  return {
    ...result,
    ...(observed ? { raw: { ...(result.raw as object), observed } } : {}),
    ...(workflowRunId !== runId ? { workflowRunId } : {}),
  };
}

function asErrorText(value: unknown): string {
  if (typeof value === 'string') {
    return value === '[object Object]' ? '' : value;
  }
  if (value && typeof value === 'object') {
    const rec = value as { message?: unknown; error?: unknown; field?: unknown };
    if (typeof rec.message === 'string' && rec.message && rec.message !== '[object Object]') {
      return rec.message;
    }
    if (typeof rec.error === 'string' && rec.error && rec.error !== '[object Object]') {
      return rec.error;
    }
    if (typeof rec.field === 'string' && rec.field) {
      return `Validation failed (${rec.field})`;
    }
    try {
      return JSON.stringify(value);
    } catch {
      return '';
    }
  }
  const text = String(value ?? '');
  return text === '[object Object]' ? '' : text;
}

function summarizeError(raw: unknown, results: McpStepResult[]): string {
  const failed = results.find((r) => r.ok === false || r.error);
  const fromStep = asErrorText(failed?.error);
  if (fromStep) return fromStep;
  if (raw && typeof raw === 'object' && 'error' in raw) {
    const fromRaw = asErrorText((raw as { error?: unknown }).error);
    if (fromRaw) return fromRaw;
  }
  return 'mcp_execute_failed';
}
