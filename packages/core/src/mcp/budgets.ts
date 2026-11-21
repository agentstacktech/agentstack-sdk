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

/** Default sync batch lane when discovery omits execute_budget (mirrors LANE_CAPS_MS.mcp_batch). */
export const MCP_SYNC_BATCH_LANE_MS_DEFAULT = 120_000;

/** HTTP client timeout for agentstack.execute sync batches: lane + 10s slack. */
export const MCP_SYNC_BATCH_CLIENT_TIMEOUT_MS = MCP_SYNC_BATCH_LANE_MS_DEFAULT + 10_000;

/** Resolve sync batch client timeout from published execute_budget (Compass / sdk.protocol). */
export function resolveMcpSyncBatchClientTimeoutMs(
  discoveryOrActions: Record<string, unknown> | null | undefined,
): number {
  const budget = readMcpExecuteBudget(discoveryOrActions);
  const laneMs =
    (typeof budget?.timeout_ms === 'number' && budget.timeout_ms > 0
      ? budget.timeout_ms
      : undefined) ??
    (typeof budget?.sync_lane_ms === 'number' && budget.sync_lane_ms > 0
      ? budget.sync_lane_ms
      : undefined) ??
    MCP_SYNC_BATCH_LANE_MS_DEFAULT;
  return laneMs + 10_000;
}

export function readMcpExecuteBudget(
  discoveryOrActions: Record<string, unknown> | null | undefined,
): McpExecuteBudget | undefined {
  const raw = discoveryOrActions?.execute_budget;
  if (!raw || typeof raw !== 'object') return undefined;
  return raw as McpExecuteBudget;
}