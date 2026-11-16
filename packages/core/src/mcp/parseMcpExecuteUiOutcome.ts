/**
 * UI-oriented execute envelope parser — shared with SPA MCP surfaces (SDK-01).
 * Genetic tag: sdk.mcp
 */
import { batchEnvelopeHasWorkGraphBlock } from './execute';

export type McpBatchUiState = 'success' | 'partial_success' | 'error';

export interface McpBatchUiOutcome {
  state: McpBatchUiState;
  partialSuccess: boolean;
  succeededCount?: number;
  failedStepIds?: string[];
  recoveryHint?: string;
  errorCode?: string;
  comfortTaskId?: string;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

function extractFailedStepErrorCode(root: Record<string, unknown>): string | undefined {
  const steps = Array.isArray(root.steps) ? root.steps : [];
  for (const rawStep of steps) {
    const step = asRecord(rawStep);
    if (!step || step.status !== 'error') continue;
    if (typeof step.error_code === 'string') return step.error_code;
  }
  return undefined;
}

function stringSuggestions(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
}

function extractComfortTaskId(root: Record<string, unknown>): string | undefined {
  const direct =
    typeof root.comfort_task_id === 'string' ? root.comfort_task_id.trim() : '';
  if (direct) return direct;
  const err = root.error;
  if (typeof err === 'object' && err !== null) {
    const e = err as Record<string, unknown>;
    const fromErr =
      typeof e.comfort_task_id === 'string' ? e.comfort_task_id.trim() : '';
    if (fromErr) return fromErr;
    const details = e.details;
    if (typeof details === 'object' && details !== null) {
      const d = details as Record<string, unknown>;
      const fromDetails =
        typeof d.comfort_task_id === 'string' ? d.comfort_task_id.trim() : '';
      if (fromDetails) return fromDetails;
    }
  }
  const steps = Array.isArray(root.steps) ? root.steps : [];
  for (const rawStep of steps) {
    const step = asRecord(rawStep);
    if (!step || step.status !== 'error') continue;
    const result = asRecord(step.result);
    const data = result ? asRecord(result.data) : null;
    if (data) {
      const nested = extractComfortTaskId(data);
      if (nested) return nested;
    }
  }
  return undefined;
}

function extractRecoveryHint(root: Record<string, unknown>): string | undefined {
  const err = root.error;
  if (typeof err === 'object' && err !== null) {
    const e = err as Record<string, unknown>;
    if (typeof e.mcp_recovery_hint_ru === 'string' && e.mcp_recovery_hint_ru.trim()) {
      return e.mcp_recovery_hint_ru;
    }
    if (typeof e.recovery_hint_ru === 'string' && e.recovery_hint_ru.trim()) {
      return e.recovery_hint_ru;
    }
    if (typeof e.recovery_hint === 'string' && e.recovery_hint.trim()) {
      return e.recovery_hint;
    }
    const suggested = stringSuggestions(e.suggested_actions);
    if (suggested[0]) return suggested[0];
  }
  if (typeof root.mcp_recovery_hint_ru === 'string' && root.mcp_recovery_hint_ru.trim()) {
    return root.mcp_recovery_hint_ru;
  }
  const code =
    typeof root.error_code === 'string' ? root.error_code : extractFailedStepErrorCode(root);
  const slice = asRecord(root.instruction_slice);
  const whenBlocked = slice ? asRecord(slice.when_blocked) : null;
  if (code && whenBlocked) {
    const pinned = whenBlocked[code];
    if (typeof pinned === 'string' && pinned.trim()) return pinned.trim();
  }
  const suggestions = stringSuggestions(root.suggestions);
  if (suggestions[0]) return suggestions[0];
  return undefined;
}

/** Normalize agentstack.execute body for UI state machines. */
export function parseMcpExecuteUiOutcome(data: unknown): McpBatchUiOutcome {
  const root = asRecord(data);
  if (!root) {
    return { state: 'error', partialSuccess: false };
  }
  const partialSuccess = Boolean(root.partial_success);
  const succeededCount =
    typeof root.succeeded_count === 'number' ? root.succeeded_count : undefined;
  const failedStepIds = Array.isArray(root.failed_step_ids)
    ? root.failed_step_ids.map((id) => String(id))
    : undefined;
  const errorCode =
    typeof root.error_code === 'string'
      ? root.error_code
      : extractFailedStepErrorCode(root);
  const comfortTaskId = extractComfortTaskId(root);
  const workGraphBlocked = batchEnvelopeHasWorkGraphBlock(root);
  const ok = root.ok === true || root.success === true || partialSuccess;
  if (workGraphBlocked) {
    return {
      state: 'partial_success',
      partialSuccess: true,
      succeededCount,
      failedStepIds,
      errorCode: 'work_graph_blocked',
      recoveryHint: extractRecoveryHint(root),
      comfortTaskId,
    };
  }
  if (partialSuccess) {
    return {
      state: 'partial_success',
      partialSuccess: true,
      succeededCount,
      failedStepIds,
      recoveryHint: extractRecoveryHint(root),
      errorCode,
      comfortTaskId,
    };
  }
  if (ok) {
    return { state: 'success', partialSuccess: false, succeededCount, failedStepIds };
  }
  return {
    state: 'error',
    partialSuccess: false,
    failedStepIds,
    recoveryHint: extractRecoveryHint(root),
    errorCode,
    comfortTaskId,
  };
}

/** First step `result.data` or `result` from REST execute envelope. */
export function extractFirstMcpStepPayload(data: unknown): unknown {
  const root = asRecord(data);
  if (!root) return undefined;
  const steps = Array.isArray(root.steps) ? root.steps : [];
  const first = asRecord(steps[0]);
  if (!first) return undefined;
  const result = asRecord(first.result);
  if (!result) return first.result;
  return 'data' in result ? result.data : result;
}