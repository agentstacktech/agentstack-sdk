/**
 * MCP REST discover helpers (not JSON-RPC execute).
 * Genetic tag: repo.tooling.user_cli.gen1 · repo.platform.sdk.gen1
 */

import { resolvePublicOrigin } from './urls';

export interface McpDiscoverOptions {
  apiBase: string;
  token: string;
  projectId?: number;
}

async function mcpRestJson(
  apiBase: string,
  path: string,
  init: RequestInit,
  opts: McpDiscoverOptions,
): Promise<unknown> {
  const origin = resolvePublicOrigin(apiBase);
  const headers: Record<string, string> = {
    Authorization: `Bearer ${opts.token}`,
    ...(init.headers as Record<string, string> | undefined),
  };
  if (opts.projectId != null && !headers['X-Project-ID']) {
    headers['X-Project-ID'] = String(opts.projectId);
  }
  const res = await fetch(`${origin}${path}`, { ...init, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(JSON.stringify(data));
  return data;
}

/** POST /mcp/discover/by_intent — intent → ranked MCP actions. */
export async function mcpDiscoverByIntent(
  intent: string,
  opts: McpDiscoverOptions & { projectId: number },
): Promise<unknown> {
  return mcpRestJson(
    opts.apiBase,
    '/mcp/discover/by_intent',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ intent, project_id: opts.projectId }),
    },
    opts,
  );
}

/** GET /mcp/discovery — API key capability context. */
export async function mcpGetDiscovery(opts: McpDiscoverOptions): Promise<unknown> {
  return mcpRestJson(opts.apiBase, '/mcp/discovery', { method: 'GET' }, opts);
}
