/**
 * Goal route from POST /mcp/discover/by_intent (`routed_goal` spine).
 * Genetic tag: sdk.platform.gen1 · core.agents.orchestrator.gen1
 */

import { mcpDiscoverByIntent, type McpDiscoverOptions } from './discover';

export type GoalRouteResult = {
  intent_id?: string;
  recommended_playbook?: string;
  step_id?: string;
  step_actions?: string[];
  confidence?: number;
  response_mode?: string;
  router_revision?: string;
  block_multi_agent?: boolean;
  complexity_score?: number;
};

export type ResolveGoalRouteOptions = McpDiscoverOptions & {
  projectId: number;
};

/** Authoritative playbook route — same SoT as Compass `resolveGoalRoutePlaybookHint`. */
export async function resolveGoalRoute(
  intentText: string,
  opts: ResolveGoalRouteOptions,
): Promise<GoalRouteResult | null> {
  const q = intentText.trim();
  if (!q) return null;
  const res = await mcpDiscoverByIntent(q, opts);
  const data = (res as { data?: { routed_goal?: GoalRouteResult } }).data;
  const routed = data?.routed_goal;
  if (!routed || typeof routed !== 'object') return null;
  return routed;
}

export function goalRoutePlaybookId(route: GoalRouteResult | null | undefined): string {
  return String(route?.recommended_playbook ?? '').trim();
}
