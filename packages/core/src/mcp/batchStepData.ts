/**
 * MCP batch step unwrap — parity with hosted-sdk-cdn hostedWireCore (G6b).
 * Gene: repo.platform.sdk.cdn.gen1 · core.mcp.self_description.gen1
 */
import { normalizeMcpToolEnvelope } from '../agents/planGraph';

export type McpStepLike = {
  ok?: boolean;
  status?: string;
  result?: unknown;
  data?: unknown;
  error?: string | null;
  capability_result?: {
    ok?: boolean;
    data?: unknown;
    error?: { message?: string; code?: string } | string;
  };
};

export type McpBatchPayloadLike = {
  steps?: McpStepLike[];
  results?: McpStepLike[];
};

export function firstMcpBatchStep(
  payload: McpBatchPayloadLike | undefined,
): McpStepLike | undefined {
  if (!payload) return undefined;
  const steps = payload.steps ?? payload.results;
  return Array.isArray(steps) && steps.length ? steps[0] : undefined;
}

function unwrapMcpPayload(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const obj = raw as Record<string, unknown>;
  if (obj.data && typeof obj.data === 'object' && !Array.isArray(obj.data)) {
    return obj.data as Record<string, unknown>;
  }
  return obj;
}

export function mcpStepData(step: McpStepLike | undefined): Record<string, unknown> {
  if (!step) return {};
  const direct = unwrapMcpPayload(step.result ?? step.data);
  if (Object.keys(direct).length > 0) return direct;
  const cap = step.capability_result;
  if (cap && typeof cap === 'object') return unwrapMcpPayload(cap.data);
  return {};
}

/** Build one MCP batch step — ``project_id`` required for hosted ingress guard. */
export function mcpBatchStep(
  action: string,
  params: Record<string, unknown>,
  projectId: number,
  id = 'step_0',
): { id: string; action: string; params: Record<string, unknown> } {
  return {
    id,
    action,
    params: { project_id: projectId, ...params },
  };
}

/** Unwrap MCP batch execute to the first step payload (operator + hosted). */
export function unwrapFirstMcpBatchStepData(raw: unknown): Record<string, unknown> {
  const row = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const { data: normalized } = normalizeMcpToolEnvelope(raw);
  const stepsRaw = row.steps ?? normalized.steps;
  const step = firstMcpBatchStep({
    steps: Array.isArray(stepsRaw) ? (stepsRaw as McpStepLike[]) : undefined,
  });
  const fromStep = mcpStepData(step);
  if (Object.keys(fromStep).length > 0) {
    return { ...normalized, ...fromStep };
  }
  return normalized;
}
