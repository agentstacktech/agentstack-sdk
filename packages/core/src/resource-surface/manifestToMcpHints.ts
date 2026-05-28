/**
 * Export manifest actions as MCP hint rows for parity CI.
 * Genetic tag: `frontend.platform.resource_surface.gen1`
 */

export interface McpActionHint {
  domain: string;
  actionId: string;
  verb: string;
  toolPrefix?: string;
  suggestedTool: string;
}

export interface ManifestLike {
  domain: string;
  actions: Array<{ id: string; verb: string }>;
  mcp?: { toolPrefix?: string };
}

export function manifestToMcpHints(manifest: ManifestLike): McpActionHint[] {
  const prefix = manifest.mcp?.toolPrefix ?? manifest.domain.split('.')[0];
  return manifest.actions.map((a) => ({
    domain: manifest.domain,
    actionId: a.id,
    verb: a.verb,
    toolPrefix: prefix,
    suggestedTool: `${prefix}.${a.id.replace(/_/g, '.')}`,
  }));
}
