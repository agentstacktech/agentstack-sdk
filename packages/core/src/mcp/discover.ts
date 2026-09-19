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

export interface McpActionEffect {
  kind?: 'read' | 'mutate' | 'destructive' | 'evaluate';
  generation?: boolean;
  budget?: string;
  write_mode?: boolean;
  destructive?: boolean;
  external_side_effect?: boolean;
  audit_side_effect?: boolean;
}

export interface McpInstructionSlice {
  when_to_use?: string;
  instruction_hint?: string;
  related_tools?: string[];
  related_prompts?: string[];
  organ_id?: string;
  owner_gene?: string;
  onboarding_tier?: string;
  capability_descriptor?: Record<string, unknown>;
  error_hints?: Array<{ code: string; tip: string }>;
  effect?: McpActionEffect;
}

export interface McpDiscoverIntentRow {
  intent_id: string;
  intent_name: string;
  category: string;
  description: string;
  required_tools: string[];
  optional_tools: string[];
  workflow_id?: string;
  estimated_steps?: number;
  difficulty?: string;
  confidence?: number;
  example_params?: Record<string, unknown>;
  primary_tool?: string;
  instruction_slice?: McpInstructionSlice;
  note?: string;
}

export interface McpDiscoverByIntentResult {
  success: boolean;
  data: {
    intents: McpDiscoverIntentRow[];
    total: number;
    query: string;
    message?: string;
  };
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
): Promise<McpDiscoverByIntentResult> {
  const raw = await mcpRestJson(
    opts.apiBase,
    '/mcp/discover/by_intent',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ intent, project_id: opts.projectId }),
    },
    opts,
  );
  return raw as McpDiscoverByIntentResult;
}

/** GET /mcp/discovery — API key capability context. */
export async function mcpGetDiscovery(opts: McpDiscoverOptions): Promise<unknown> {
  return mcpRestJson(opts.apiBase, '/mcp/discovery', { method: 'GET' }, opts);
}
