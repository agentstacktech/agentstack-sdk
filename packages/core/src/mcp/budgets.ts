/**
 * Mirrors `shared/mcp/execute_budget.actions_catalog_budget()` on discovery.list / GET /mcp/actions.
 * Genetic tag: core.mcp.tools.gen1
 * See docs/perf/DEADLINE_LADDER.md
 */

export interface McpExecuteBudgetAsync {
  enable: string;
  poll_action: string;
  poll_rest?: string;
  lease_ms: number;
}

/** Machine-readable MCP execute lane caps (server-published). */
export interface McpExecuteBudget {
  sync_lane: string;
  sync_lane_ms: number;
  timeout_ms: number;
  single_heavy_lane: string;
  single_heavy_timeout_ms: number;
  max_sync_heavy_actions: number;
  heavy_actions?: string[];
  async?: McpExecuteBudgetAsync;
}

/** Client default for lone heavy sync — headroom over server `ai_stream` lane. */
export const MCP_CLIENT_HEAVY_SYNC_TIMEOUT_MS = 195_000;

export function readMcpExecuteBudget(
  discoveryOrActions: Record<string, unknown> | null | undefined,
): McpExecuteBudget | undefined {
  const raw = discoveryOrActions?.execute_budget;
  if (!raw || typeof raw !== 'object') return undefined;
  return raw as McpExecuteBudget;
}