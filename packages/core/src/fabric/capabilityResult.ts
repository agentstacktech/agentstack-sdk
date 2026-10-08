/**
 * Capability result envelope — SDK mirror (`sdk.fabric.gen1`).
 */
import { z } from 'zod';

import { contextCitationSchema } from './contextBundle';

export const capabilityErrorSchema = z.object({
  code: z.string().min(1),
  message: z.string(),
  retryable: z.boolean().default(false),
  details: z.record(z.unknown()).default({}),
});

export const capabilityCostSchema = z.object({
  tokens: z.number().int().nonnegative().default(0),
  usd: z.number().nonnegative().default(0),
  credits: z.number().nonnegative().default(0),
});

export const capabilityCacheInfoSchema = z.object({
  hit: z.boolean().default(false),
  key: z.string().optional(),
});

/** Async receipt / projection lag hints on MCP data payloads. */
export const capabilityProjectionSchema = z.object({
  state: z.string().optional(),
  retry_after_ms: z.number().int().nonnegative().optional(),
  verification_action: z.string().optional(),
  accepted: z.boolean().optional(),
  committed: z.boolean().optional(),
});

export const capabilityResultSchema = z
  .object({
    ok: z.boolean(),
    data: z.unknown().optional(),
    error: capabilityErrorSchema.optional(),
    trace_id: z.string().optional(),
    cost: capabilityCostSchema.default({}),
    citations: z.array(contextCitationSchema).default([]),
    cache: capabilityCacheInfoSchema.default({}),
    /** Top-level projection_state when surfaced by BFF (usually data.projection.state). */
    projection_state: z.string().optional(),
    projection: capabilityProjectionSchema.optional(),
  })
  .superRefine((val, ctx) => {
    if (val.ok && val.error != null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'CapabilityResult: ok=true requires error=null',
      });
    }
    if (!val.ok && val.error == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'CapabilityResult: ok=false requires error!=null',
      });
    }
  });

export type CapabilityError = z.infer<typeof capabilityErrorSchema>;
export type CapabilityCost = z.infer<typeof capabilityCostSchema>;
export type CapabilityCacheInfo = z.infer<typeof capabilityCacheInfoSchema>;
export type CapabilityProjection = z.infer<typeof capabilityProjectionSchema>;
export type CapabilityResult = z.infer<typeof capabilityResultSchema>;

function mergedPollHintSources(client: Record<string, unknown>): Record<string, unknown> {
  const merged: Record<string, unknown> = { ...client };
  const data = client.data;
  if (data && typeof data === 'object') {
    Object.assign(merged, data as Record<string, unknown>);
  }
  const cap = client.capability_result;
  if (cap && typeof cap === 'object') {
    const capData = (cap as Record<string, unknown>).data;
    if (capData && typeof capData === 'object') {
      Object.assign(merged, capData as Record<string, unknown>);
    }
  }
  return merged;
}

/** Hoist poll/retry hints for batch success steps (Python: batch_step_poll_fields). */
export function batchStepPollFields(client: Record<string, unknown>): Record<string, unknown> {
  const merged = mergedPollHintSources(client);
  const out: Record<string, unknown> = {};
  if (merged.retryable === true) {
    out.retryable = true;
  }
  for (const hintKey of [
    'next_actions',
    'projection',
    'verification_action',
    'retry_after_ms',
  ] as const) {
    if (hintKey in merged) {
      out[hintKey] = merged[hintKey];
    }
  }
  return out;
}

/** Extract projection.state from MCP data or envelope projection hints. */
export type PollMcpVerificationOptions = {
  execute: (action: string, params?: Record<string, unknown>) => Promise<unknown>;
  verificationAction: string;
  params?: Record<string, unknown>;
  retryAfterMs?: number;
  maxAttempts?: number;
};

/** Terminal projection states — Python SoT: shared/mcp/projection_state.py */
export const SETTLED_PROJECTION_STATES = new Set(['ready', 'deleted', 'done']);

/** States that block dependent batch mutations (Python SoT). */
export const BLOCKING_PROJECTION_STATES = new Set([
  'pending',
  'creating',
  'deleting',
  'not_ready',
]);

/** Read-model lag — informational only, does not block unrelated mutations. */
export const INFORMATIONAL_PROJECTION_STATES = new Set(['stale']);

/** All non-settled projection states (read / telemetry). */
export const ASYNC_PROJECTION_STATES = new Set([
  ...BLOCKING_PROJECTION_STATES,
  ...INFORMATIONAL_PROJECTION_STATES,
]);

export function isProjectionSettled(state?: string): boolean {
  if (!state) {
    return true;
  }
  return SETTLED_PROJECTION_STATES.has(state.trim().toLowerCase());
}

function findProjectionDict(input: unknown): Record<string, unknown> | undefined {
  if (input == null || typeof input !== 'object') {
    return undefined;
  }
  const r = input as Record<string, unknown>;
  const projection = r.projection;
  if (projection && typeof projection === 'object') {
    const state = (projection as Record<string, unknown>).state;
    if (typeof state === 'string' && state.trim()) {
      return { ...(projection as Record<string, unknown>) };
    }
  }
  const cap = r.capability_result;
  if (cap && typeof cap === 'object') {
    const capRec = cap as Record<string, unknown>;
    const err = capRec.error;
    if (err && typeof err === 'object') {
      const details = (err as Record<string, unknown>).details;
      if (details && typeof details === 'object') {
        const errProj = (details as Record<string, unknown>).projection;
        if (errProj && typeof errProj === 'object') {
          const state = (errProj as Record<string, unknown>).state;
          if (typeof state === 'string' && state.trim()) {
            return { ...(errProj as Record<string, unknown>) };
          }
        }
      }
    }
    const nested = findProjectionDict(cap);
    if (nested) {
      return nested;
    }
  }
  const data = r.data;
  if (data && typeof data === 'object') {
    const nested = findProjectionDict(data);
    if (nested) {
      return nested;
    }
  }
  const steps = r.steps;
  if (Array.isArray(steps) && steps.length > 0 && steps[0] && typeof steps[0] === 'object') {
    const result = (steps[0] as Record<string, unknown>).result;
    if (result && typeof result === 'object') {
      return findProjectionDict(result);
    }
  }
  return undefined;
}

export function isBlockingProjectionState(state?: string): boolean {
  if (!state) {
    return false;
  }
  return BLOCKING_PROJECTION_STATES.has(state.trim().toLowerCase());
}

/** Blocking projection only (excludes informational ``stale``). */
export function extractBlockingProjection(
  input: unknown,
): Record<string, unknown> | undefined {
  const proj = extractAsyncProjection(input);
  if (!proj) {
    return undefined;
  }
  const state = String(proj.state ?? readProjectionState(input) ?? '');
  if (!isBlockingProjectionState(state)) {
    return undefined;
  }
  return proj;
}

/** Producer verify params from ``next_actions[0].params`` when present. */
export function extractVerificationParamsFromPayload(input: unknown): Record<string, unknown> {
  if (input == null || typeof input !== 'object') {
    return {};
  }
  const r = input as Record<string, unknown>;
  const actions = r.next_actions;
  if (Array.isArray(actions) && actions.length > 0) {
    const first = actions[0];
    if (first && typeof first === 'object') {
      const params = (first as Record<string, unknown>).params;
      if (params && typeof params === 'object') {
        return { ...(params as Record<string, unknown>) };
      }
    }
  }
  const data = r.data;
  if (data && typeof data === 'object') {
    return extractVerificationParamsFromPayload(data);
  }
  const cap = r.capability_result;
  if (cap && typeof cap === 'object') {
    return extractVerificationParamsFromPayload(cap);
  }
  return {};
}

/** Mirror Python ``extract_async_projection`` for batch / poll clients. */
export function extractAsyncProjection(
  input: unknown,
): Record<string, unknown> | undefined {
  const state = readProjectionState(input);
  if (!state || isProjectionSettled(state)) {
    return undefined;
  }
  const projection = findProjectionDict(input);
  if (projection) {
    return { ...projection, state: projection.state ?? state };
  }
  if (input != null && typeof input === 'object') {
    const r = input as Record<string, unknown>;
    return {
      state,
      verification_action: r.verification_action,
      retry_after_ms: (r.retry_after_ms as number | undefined) ?? 1500,
    };
  }
  return undefined;
}

/** MCC partial states — mirror Python envelope_guard committed partial shapes. */
export const MCC_PARTIAL_STATES = new Set(['partial']);

export function isCommittedPartial(input: unknown): boolean {
  if (input == null || typeof input !== 'object') {
    return false;
  }
  const r = input as Record<string, unknown>;
  const data =
    r.data && typeof r.data === 'object' ? (r.data as Record<string, unknown>) : r;
  const committed = data.committed === true;
  const state = String(data.state ?? '');
  const code = String(data.error_code ?? data.code ?? '');
  return (
    committed &&
    (MCC_PARTIAL_STATES.has(state) || code === 'mutation_applied_partial')
  );
}

export type RagLifecycleState = 'ready' | 'creating' | 'deleting' | 'failed';

export type PollRagCollectionOptions = {
  execute: (action: string, params?: Record<string, unknown>) => Promise<unknown>;
  projectId: number;
  /** RAG SoT scope param — preferred over project_id when set. */
  homeProjectId?: number;
  collectionId: string;
  retryAfterMs?: number;
  maxAttempts?: number;
};

/** Non-blocking read-model lag fields (e.g. CRM contact360 deals after batch). */
export function readInformationalProjectionPending(input: unknown): string[] {
  const proj = readProjectionDict(input);
  if (!proj) {
    return [];
  }
  const pending = proj.projection_pending;
  if (!Array.isArray(pending)) {
    return [];
  }
  return pending.filter((v): v is string => typeof v === 'string' && v.length > 0);
}

function readProjectionDict(input: unknown): Record<string, unknown> | undefined {
  if (input == null || typeof input !== 'object') {
    return undefined;
  }
  const r = input as Record<string, unknown>;
  const direct = r.projection;
  if (direct && typeof direct === 'object') {
    return direct as Record<string, unknown>;
  }
  const data = r.data;
  if (data && typeof data === 'object') {
    const nested = (data as Record<string, unknown>).projection;
    if (nested && typeof nested === 'object') {
      return nested as Record<string, unknown>;
    }
  }
  const cap = r.capability_result;
  if (cap && typeof cap === 'object') {
    const capRec = cap as Record<string, unknown>;
    const capData = capRec.data;
    if (capData && typeof capData === 'object') {
      const nested = (capData as Record<string, unknown>).projection;
      if (nested && typeof nested === 'object') {
        return nested as Record<string, unknown>;
      }
    }
    const err = capRec.error;
    if (err && typeof err === 'object') {
      const details = (err as Record<string, unknown>).details;
      if (details && typeof details === 'object') {
        const nested = (details as Record<string, unknown>).projection;
        if (nested && typeof nested === 'object') {
          return nested as Record<string, unknown>;
        }
      }
    }
  }
  return undefined;
}

/** True when payload explicitly reports mutation committed (v13 receipt). */
export function readMutationCommitted(input: unknown): boolean {
  if (input == null || typeof input !== 'object') {
    return false;
  }
  const r = input as Record<string, unknown>;
  if (r.committed === true) {
    return true;
  }
  const data = r.data;
  if (data && typeof data === 'object' && (data as Record<string, unknown>).committed === true) {
    return true;
  }
  const cap = r.capability_result;
  if (cap && typeof cap === 'object') {
    const capData = (cap as Record<string, unknown>).data;
    if (
      capData &&
      typeof capData === 'object' &&
      (capData as Record<string, unknown>).committed === true
    ) {
      return true;
    }
  }
  return false;
}

/** Poll ``rag.collection_get`` until lifecycle projection settles (ready/deleted/failed). */
export async function pollRagCollectionUntilReady(
  options: PollRagCollectionOptions,
): Promise<unknown> {
  const {
    execute,
    projectId,
    homeProjectId,
    collectionId,
    retryAfterMs = 1000,
    maxAttempts = 8,
  } = options;
  const scopeId = homeProjectId ?? projectId;
  return pollMcpVerificationAction({
    execute,
    verificationAction: 'rag.collection_get',
    params: {
      home_project_id: scopeId,
      project_id: scopeId,
      collection_id: collectionId,
    },
    retryAfterMs,
    maxAttempts,
  });
}

export type PollRagIngestOptions = {
  execute: (action: string, params?: Record<string, unknown>) => Promise<unknown>;
  projectId: number;
  /** RAG SoT scope param — preferred over project_id when set. */
  homeProjectId?: number;
  jobId: string;
  retryAfterMs?: number;
  maxAttempts?: number;
};

/** True when ingest job status payload reached a terminal state. */
export function readIngestJobDone(input: unknown): boolean {
  if (input == null || typeof input !== 'object') {
    return false;
  }
  const r = input as Record<string, unknown>;
  if (r.done === true) {
    return true;
  }
  const data = r.data;
  if (data && typeof data === 'object' && (data as Record<string, unknown>).done === true) {
    return true;
  }
  const status =
    r.status ??
    (data && typeof data === 'object'
      ? (data as Record<string, unknown>).status
      : undefined);
  if (
    typeof status === 'string' &&
    ['done', 'partial', 'failed', 'deduped'].includes(status.trim().toLowerCase())
  ) {
    return true;
  }
  const state = readProjectionState(input);
  return Boolean(state && isProjectionSettled(state));
}

/** Poll ``rag.ingest_job_status`` until ``done`` or terminal ``status``. */
export async function pollRagIngestUntilDone(
  options: PollRagIngestOptions,
): Promise<unknown> {
  const {
    execute,
    projectId,
    homeProjectId,
    jobId,
    retryAfterMs = 1000,
    maxAttempts = 12,
  } = options;
  const scopeId = homeProjectId ?? projectId;
  let last: unknown;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    last = await execute('rag.ingest_job_status', {
      home_project_id: scopeId,
      project_id: scopeId,
      job_id: jobId,
    });
    if (readIngestJobDone(last)) {
      return last;
    }
    if (attempt + 1 < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, retryAfterMs));
    }
  }
  return last;
}

/** Thin poll helper for MCP verify-after-write flows (rag, scheduler, generation). */
export async function pollMcpVerificationAction(
  options: PollMcpVerificationOptions,
): Promise<unknown> {
  const {
    execute,
    verificationAction,
    params = {},
    retryAfterMs = 1000,
    maxAttempts = 8,
  } = options;
  let last: unknown;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    last = await execute(verificationAction, params);
    const committed = readMutationCommitted(last);
    if (committed || isProjectionSettled(readProjectionState(last))) {
      return last;
    }
    if (attempt + 1 < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, retryAfterMs));
    }
  }
  return last;
}

export function readProjectionState(input: unknown): string | undefined {
  if (input == null || typeof input !== 'object') {
    return undefined;
  }
  const r = input as Record<string, unknown>;
  const top = r.projection_state;
  if (typeof top === 'string' && top.trim()) {
    return top.trim();
  }
  const projection = r.projection;
  if (projection && typeof projection === 'object') {
    const state = (projection as Record<string, unknown>).state;
    if (typeof state === 'string' && state.trim()) {
      return state.trim();
    }
  }
  const cap = r.capability_result;
  if (cap && typeof cap === 'object') {
    const capRec = cap as Record<string, unknown>;
    const err = capRec.error;
    if (err && typeof err === 'object') {
      const details = (err as Record<string, unknown>).details;
      if (details && typeof details === 'object') {
        const errProj = (details as Record<string, unknown>).projection;
        if (errProj && typeof errProj === 'object') {
          const state = (errProj as Record<string, unknown>).state;
          if (typeof state === 'string' && state.trim()) {
            return state.trim();
          }
        }
      }
    }
    const nested = readProjectionState(cap);
    if (nested) {
      return nested;
    }
  }
  const data = r.data;
  if (data && typeof data === 'object') {
    const nested = readProjectionState(data as Record<string, unknown>);
    if (nested) {
      return nested;
    }
  }
  const steps = r.steps;
  if (Array.isArray(steps) && steps.length > 0 && steps[0] && typeof steps[0] === 'object') {
    const result = (steps[0] as Record<string, unknown>).result;
    if (result && typeof result === 'object') {
      return readProjectionState(result);
    }
  }
  const lifecycle = r.lifecycle;
  if (lifecycle && typeof lifecycle === 'object') {
    const state = (lifecycle as Record<string, unknown>).state;
    if (typeof state === 'string' && state.trim()) {
      return state.trim();
    }
  }
  const state = r.state;
  if (
    typeof state === 'string' &&
    state.trim() &&
    ASYNC_PROJECTION_STATES.has(state.trim())
  ) {
    return state.trim();
  }
  return undefined;
}

export function parseCapabilityResult(input: unknown): CapabilityResult {
  return capabilityResultSchema.parse(input);
}

/** Mirror Python ``resolve_mcp_error`` for SDK consumers. */
export function parseMcpRecoveryError(
  code: string | null | undefined,
  context?: Record<string, unknown>,
): {
  code: string;
  hint?: string;
  suggested_actions: string[];
} {
  const key = String(code || 'internal');
  const hints: Record<string, string> = {
    auth_required:
      'Authenticate first, then run agentstack_session_setup to bind context.project_id.',
    validation_error: 'Fix params using GET /mcp/actions input schema.',
    action_not_found: 'Use discovery.list or discovery.search for exact action names.',
    permission_denied: 'Widen RBAC or use rbac.check_permission before retry.',
    not_ready: 'Resource not yet visible — poll list/status with retry_after_ms.',
    mcp_sync_heavy_limit:
      'Split batch or set options.async=true and poll discovery.job_status.',
  };
  const hint = hints[key];
  const suggested_actions = hint ? [hint] : [];
  if (context?.suggested_actions && Array.isArray(context.suggested_actions)) {
    for (const item of context.suggested_actions) {
      if (typeof item === 'string' && !suggested_actions.includes(item)) {
        suggested_actions.push(item);
      }
    }
  }
  return { code: key, hint, suggested_actions };
}
