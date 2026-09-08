/**
 * Agents fleet run DTO helpers — mirrors Python ``agent_agents_types`` (sdk.agents.gen1).
 */

export const TERMINAL_RUN_STATUSES = new Set(['completed', 'failed', 'cancelled']);

export interface AgentRunSpecLike {
  status?: string;
  pending_tool_call?: Record<string, unknown> | null;
  approval_artifact_hash?: string | null;
}

export interface AgentRunRowLike {
  uuid?: string;
  agent_run_spec?: AgentRunSpecLike;
}

export interface AgentRunDetailLike {
  run_id?: string;
  status?: string;
  pending_approval?: Record<string, unknown> | null;
  approval_artifact_hash?: string | null;
  approval_review?: { approval_artifact_hash?: string | null } | null;
}

export interface AgentGetRunPayloadLike {
  run_detail?: AgentRunDetailLike;
  run?: AgentRunRowLike;
}

export function runStatusFromGetRunPayload(
  payload: AgentGetRunPayloadLike | null | undefined,
): string | null {
  const detail = payload?.run_detail;
  if (detail?.status) return String(detail.status);
  const spec = payload?.run?.agent_run_spec;
  if (spec?.status) return String(spec.status);
  return null;
}

export function isTerminalRunStatus(status: string | null | undefined): boolean {
  return TERMINAL_RUN_STATUSES.has(String(status ?? ''));
}

export function approvalArtifactHashFromDetail(
  detail: AgentRunDetailLike | null | undefined,
): string | null {
  const direct = detail?.approval_artifact_hash;
  if (direct) return String(direct);
  const review = detail?.approval_review;
  if (review && typeof review === 'object' && review.approval_artifact_hash) {
    return String(review.approval_artifact_hash);
  }
  return null;
}

export function approvalArtifactHashFromRunRow(
  row: AgentRunRowLike | null | undefined,
): string | null {
  const hash = row?.agent_run_spec?.approval_artifact_hash;
  return hash ? String(hash) : null;
}
