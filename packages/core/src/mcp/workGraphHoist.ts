/**
 * MCP work-graph wire hoists (parity with shared/mcp/wire_hoist_keys.py).
 * Kept separate from execute.ts ↔ planGraph.ts to avoid circular imports (ENV-6).
 */

export const MCP_WORK_GRAPH_HOIST_KEYS = [
  'next_actions',
  'projection',
  'verification_action',
  'retry_after_ms',
  'detail_effective',
  'envelope_version',
  'wip_items',
  'plan_completion',
] as const;

/** Merge hoisted MCP wire fields into work-graph / batch step payloads (rv-23). */
export function normalizeMcpWorkGraphPayload(
  raw: Record<string, unknown>,
): Record<string, unknown> {
  const out = { ...raw };
  const data = out.data;
  for (const key of MCP_WORK_GRAPH_HOIST_KEYS) {
    if (out[key] !== undefined) continue;
    if (data && typeof data === 'object' && (data as Record<string, unknown>)[key] !== undefined) {
      out[key] = (data as Record<string, unknown>)[key];
    }
  }
  return out;
}
