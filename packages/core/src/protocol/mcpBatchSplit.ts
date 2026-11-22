/**
 * Client-side KISS helper — split hub (pid=1) vs tenant MCP batch executes.
 * Gene: repo.platform.sdk.agent_protocol.gen1
 */

import hubFixture from './mcpEcosystemHubActions.v1.json';

export type McpBatchStep = {
  action: string;
  params?: Record<string, unknown>;
  id?: string;
};

export type McpBatchPayload = {
  context?: { project_id?: number };
  steps: McpBatchStep[];
  options?: Record<string, unknown>;
};

/** SoT: shared/mcp/batch_scope_policy.BATCH_STEP_ECOSYSTEM_HUB_PID (codegen). */
const ECOSYSTEM_HUB_ACTIONS = new Set<string>(
  Array.isArray((hubFixture as { actions?: string[] }).actions)
    ? (hubFixture as { actions: string[] }).actions
    : [],
);

export function splitMcpBatchByScope(
  batch: McpBatchPayload,
  tenantProjectId: number,
  ecosystemProjectId = 1,
): McpBatchPayload[] {
  const hub: McpBatchStep[] = [];
  const tenant: McpBatchStep[] = [];
  for (const step of batch.steps || []) {
    const sp = Number(step.params?.project_id ?? tenantProjectId);
    const action = String(step.action || '');
    if (ECOSYSTEM_HUB_ACTIONS.has(action) && sp === ecosystemProjectId) {
      hub.push(step);
    } else {
      tenant.push(step);
    }
  }
  const out: McpBatchPayload[] = [];
  if (hub.length) {
    out.push({
      ...batch,
      context: { ...batch.context, project_id: ecosystemProjectId },
      steps: hub,
    });
  }
  if (tenant.length) {
    out.push({
      ...batch,
      context: { ...batch.context, project_id: tenantProjectId },
      steps: tenant,
    });
  }
  return out.length ? out : [batch];
}

/** @deprecated use splitMcpBatchByScope */
export const executeBatchSplit = splitMcpBatchByScope;