/**
 * MCP onboarding guidance for SDK consumers.
 * Genetic tag: repo.platform.sdk.ai_surface.gen1
 */

export const MCP_GUIDANCE_PROMPTS = {
  system: 'agentstack_system_instructions',
  readBootstrap: 'agentstack_read_bootstrap',
  executeBudget: 'agentstack_execute_budget',
  writeModes: 'agentstack_write_modes',
  apiKeySafety: 'agentstack_api_key_safety',
  tenant8dna: 'agentstack_tenant_8dna_supply',
  knowledgeMentor: 'agentstack_knowledge_mentor',
  guidanceCompass: 'agentstack_guidance_compass',
  projectTreasury: 'agentstack_project_treasury',
} as const;

export const MCP_ONBOARDING_RECIPE_IDS = [
  'mcp_read_bootstrap',
  'mcp_hosting_quickstart',
  'mcp_integrations_checkout_crm',
  'mcp_agents_run_approve',
  'mcp_knowledge_ingest',
  'mcp_crm_contact_deal',
  'mcp_support_inbox',
  'mcp_bots_simulate',
  'mcp_generation_diff',
] as const;

export type McpOnboardingRecipeId = (typeof MCP_ONBOARDING_RECIPE_IDS)[number];

export const MCP_GUIDANCE_URLS = {
  mcp: '/mcp',
  actions: '/mcp/actions',
  actionsSummary: '/mcp/actions/summary',
  health: '/mcp/health',
  manifest: '/mcp/manifest',
  organs: '/mcp/organs',
  aiPrompt: '/mcp/ai_prompt',
  discoverByIntent: '/mcp/discover/by_intent',
  promptGet: '/mcp/prompts/get',
  promptsList: '/mcp/prompts/list',
  recipes: '/mcp/recipes',
} as const;

/** Resolve full URL for an MCP guidance path on a given API base. */
export function resolveMcpGuidanceUrl(apiBase: string, path: string): string {
  const root = String(apiBase || '').replace(/\/$/, '');
  const suffix = path.startsWith('/') ? path : `/${path}`;
  if (suffix === '/mcp' || root.endsWith('/mcp')) {
    return `${root.replace(/\/mcp$/, '')}${suffix}`;
  }
  return `${root}${suffix}`;
}

/** Names of MCP prompts integrators should fetch once per session. */
export function recommendedMcpPrompts(): string[] {
  return Object.values(MCP_GUIDANCE_PROMPTS);
}

/** Onboarding recipe ids (parity with ``instruction_plane._ONBOARDING_RECIPES``). */
export function recommendedMcpRecipes(): readonly McpOnboardingRecipeId[] {
  return MCP_ONBOARDING_RECIPE_IDS;
}

export interface McpListOrgansOptions {
  apiBase: string;
  token: string;
  domain?: string;
  kind?: string;
}

/** GET /mcp/organs — organism self-description index for MCP agents. */
export async function mcpListOrgans(opts: McpListOrgansOptions): Promise<unknown> {
  const root = String(opts.apiBase || '').replace(/\/$/, '');
  const origin = root.endsWith('/mcp') ? root.replace(/\/mcp$/, '') : root;
  const params = new URLSearchParams();
  if (opts.domain) params.set('domain', opts.domain);
  if (opts.kind) params.set('kind', opts.kind);
  const qs = params.toString();
  const path = qs ? `/mcp/organs?${qs}` : '/mcp/organs';
  const res = await fetch(`${origin}${path}`, {
    headers: { Authorization: `Bearer ${opts.token}` },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(JSON.stringify(data));
  return data;
}

/** GET /mcp/actions/summary — lightweight catalog totals (no auth required on public plane). */
export async function fetchMcpActionsSummary(
  apiBase: string,
): Promise<{ total_actions: number; version?: string; entrypoint?: string }> {
  const origin = resolveMcpGuidanceUrl(apiBase, MCP_GUIDANCE_URLS.actionsSummary);
  const res = await fetch(origin);
  const data = (await res.json().catch(() => ({}))) as {
    total_actions?: number;
    version?: string;
    entrypoint?: string;
  };
  if (!res.ok) throw new Error(JSON.stringify(data));
  return {
    total_actions: Number(data.total_actions ?? 0),
    version: data.version,
    entrypoint: data.entrypoint,
  };
}

export interface McpListActionsOptions {
  apiBase: string;
  token: string;
}

/** GET /mcp/actions — enriched MCP catalog (includes capability_descriptor slim rows). */
export async function mcpListActions(opts: McpListActionsOptions): Promise<unknown> {
  const origin = resolveMcpGuidanceUrl(opts.apiBase, MCP_GUIDANCE_URLS.actions);
  const res = await fetch(origin, {
    headers: { Authorization: `Bearer ${opts.token}` },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(JSON.stringify(data));
  return data;
}
