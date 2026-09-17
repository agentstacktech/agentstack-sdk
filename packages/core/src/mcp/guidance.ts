/**
 * MCP onboarding guidance for SDK consumers.
 * Genetic tag: repo.platform.sdk.ai_surface.gen1
 */

import type { McpCatalogActionRow } from '../fabric/capabilityDescriptor';
import { mcpExecute, type McpExecuteResult, type McpStep } from './execute';

export const MCP_GUIDANCE_PROMPTS = {
  system: 'agentstack_system_instructions',
  sessionSetup: 'agentstack_session_setup',
  readBootstrap: 'agentstack_read_bootstrap',
  executeBudget: 'agentstack_execute_budget',
  writeModes: 'agentstack_write_modes',
  apiKeySafety: 'agentstack_api_key_safety',
  tenant8dna: 'agentstack_tenant_8dna_supply',
  knowledgeMentor: 'agentstack_knowledge_mentor',
  paradigmShift: 'agentstack_paradigm_shift',
  guidanceCompass: 'agentstack_guidance_compass',
  projectTreasury: 'agentstack_project_treasury',
} as const;

/** Product build archetypes — parity with mcp_agent_instruction_index.json product_archetypes */
export const PRODUCT_ARCHETYPE_IDS = [
  'game',
  'saas',
  'ecommerce',
  'social',
  'backend_api',
  'project_setup',
  'static_site',
  'bot_channel',
  'migrate_legacy',
  'hosted_vertical_saas',
  'key2unity_auth_portal',
] as const;

export type ProductArchetypeId = (typeof PRODUCT_ARCHETYPE_IDS)[number];

export const MCP_ONBOARDING_RECIPE_IDS = [
  'mcp_session_setup',
  'mcp_read_bootstrap',
  'mcp_hosting_quickstart',
  'mcp_integrations_checkout_crm',
  'mcp_agents_run_approve',
  'mcp_knowledge_ingest',
  'mcp_crm_contact_deal',
  'mcp_hosted_vertical_bootstrap',
  'mcp_key2unity_auth_portal',
  'mcp_support_inbox',
  'mcp_support_respond_v1',
  'mcp_analyst_readonly_v1',
  'mcp_integration_ops_v1',
  'mcp_content_writer_v1',
  'mcp_business_composite_v1',
  'mcp_bots_simulate',
  'mcp_generation_diff',
  'mcp_universal_safe_change',
  'mcp_bot_ai_release',
  'mcp_hosting_edit_site_safe',
  'mcp_project_data_safe_patch',
  'mcp_user_access_safe',
  'mcp_project_operator_session',
  'mcp_readonly_audit_v1',
  'mcp_agent_certification_v1',
  'mcp_ecosystem_cert_wave_a_v1',
  'mcp_ecosystem_cert_wave_b_v1',
  'mcp_ecosystem_cert_wave_c_v1',
  'mcp_ecosystem_cert_wave_d_v1',
  'mcp_ecosystem_cert_wave_e_v1',
  'mcp_ecosystem_cert_wave_g_v1',
] as const;

export type McpOnboardingRecipeId = (typeof MCP_ONBOARDING_RECIPE_IDS)[number];

export interface McpClientManifestClient {
  id: string;
  label: string;
  recommended?: boolean;
  oauth_client_id?: string;
  transport?: string;
  auth_methods?: string[];
  setup_step_ids?: string[];
  snippet_kind?: string;
  cookbook_recipe_id?: string;
  compass_playbook_id?: string;
  external?: Record<string, string>;
}

export interface McpClientManifest {
  version: number;
  endpoint: string;
  clients: McpClientManifestClient[];
}

/** Parse generated client manifest (SPA / plugin consumers). */
export function parseMcpClientManifest(raw: unknown): McpClientManifest {
  const data = raw as McpClientManifest;
  if (!data || !Array.isArray(data.clients)) {
    throw new Error('Invalid mcp_client_manifest: clients[] required');
  }
  return data;
}

/** Studio / iPaaS recipes (extended tier — not in default onboarding bundle). */
export const MCP_EXTENDED_RECIPE_IDS = [
  'mcp_studio_diagnostic_sow',
  'mcp_studio_phase1_knowledge_mentor',
  'mcp_integrations_webhook_scheduler',
  'mcp_integrations_crm_lead_notify',
  'mcp_studio_phase1_data_migration',
  'mcp_knowledge_playground',
] as const;

export type McpAiPromptMode = 'contract' | 'full';

export interface McpAiPromptContract {
  mode: 'contract';
  system_prompt: string;
  discovery: Record<string, unknown>;
  execute_examples: Record<string, unknown>;
  pointers: Record<string, string>;
}

export interface FetchMcpAiPromptOptions {
  apiBase: string;
  token: string;
  mode?: McpAiPromptMode;
}

/** Default list projection for MCP catalog/list tools (ECS card_row). */
export const DEFAULT_MCP_LIST_PROJECTION = 'summary' as const;

export type McpListProjection = 'summary' | 'full';

/**
 * Merge nested user + current_user + context for MCP execute payloads.
 * Parity with ``params_context.build_mcp_user_dict``.
 */
export function buildMcpUserContext(
  context: Record<string, unknown> | null | undefined,
): Record<string, unknown> {
  const base = context && typeof context === 'object' ? { ...context } : {};
  const nested =
    base.user && typeof base.user === 'object'
      ? { ...(base.user as Record<string, unknown>) }
      : {};
  const currentUser =
    base.current_user && typeof base.current_user === 'object'
      ? { ...(base.current_user as Record<string, unknown>) }
      : {};
  const merged: Record<string, unknown> = { ...nested, ...currentUser, ...base };
  const uid = merged.user_id ?? currentUser.user_id ?? nested.user_id;
  const pid = merged.project_id ?? currentUser.project_id ?? nested.project_id;
  if (uid != null && uid !== '') merged.user_id = uid;
  if (pid != null && pid !== '') merged.project_id = pid;
  return merged;
}

/** Normalize list projection param — mirrors ``ecs_list_projection.parse_projection``. */
export function parseListProjection(
  params: Record<string, unknown> | null | undefined,
  defaultMode: McpListProjection = DEFAULT_MCP_LIST_PROJECTION,
): McpListProjection {
  const raw = String(params?.projection ?? defaultMode).trim().toLowerCase();
  return raw === 'full' ? 'full' : 'summary';
}

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
  preflight: '/mcp/preflight',
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

/** Eight-step discovery ladder (parity with ``instruction_plane.discovery_ladder_steps``). */
export function recommendedDiscoveryLadder(): string[] {
  return discoveryLadderSteps().map((row) => row.url);
}

export interface McpSessionSetupLadderPhase {
  phase: number;
  id: string;
  title: string;
  recipeId?: string;
}

/** Mandatory session order (auth → project → context → work). Parity with ``session_setup_ladder_steps``. */
export function sessionSetupLadderPhases(): McpSessionSetupLadderPhase[] {
          return [
    { phase: 1, id: 'authenticate', title: 'Authenticate' },
    { phase: 2, id: 'project', title: 'Select or create project', recipeId: 'mcp_session_setup' },
    { phase: 3, id: 'bind_context', title: 'Bind context.project_id' },
    { phase: 4, id: 'domain_work', title: 'Domain actions', recipeId: 'mcp_read_bootstrap' },
  ];
}

export interface McpDiscoveryLadderStep {
  step: number;
  label: string;
  url: string;
  method: string;
}

/** Parity with onboarding bundle ``discovery_ladder`` (relative paths). */
export function discoveryLadderSteps(): McpDiscoveryLadderStep[] {
          return [
    {
      step: 0,
      label: 'Session setup (auth → project → context)',
      url: `${MCP_GUIDANCE_URLS.promptGet}?name=agentstack_session_setup`,
      method: 'GET',
    },
    {
      step: 1,
      label: 'Registry status',
      url: 'discovery.status',
      method: 'MCP',
    },
    {
      step: 2,
      label: 'Session bootstrap',
      url: `${MCP_GUIDANCE_URLS.aiPrompt}?mode=contract`,
      method: 'GET',
    },
    {
      step: 3,
      label: 'Catalog totals',
      url: MCP_GUIDANCE_URLS.actionsSummary,
      method: 'GET',
    },
    {
      step: 4,
      label: 'Catalog search / describe',
      url: 'discovery.search / discovery.describe',
      method: 'MCP',
    },
    {
      step: 5,
      label: 'Intent routing (NL)',
      url: MCP_GUIDANCE_URLS.discoverByIntent,
      method: 'POST',
    },
    {
      step: 6,
      label: 'Hot schemas',
      url: `${MCP_GUIDANCE_URLS.actions}?schemas=hot`,
      method: 'GET',
    },
    {
      step: 7,
      label: 'Named playbook',
      url: `${MCP_GUIDANCE_URLS.promptGet}?name=agentstack_read_bootstrap`,
      method: 'GET',
    },
    {
      step: 8,
      label: 'Multi-step recipes',
      url: MCP_GUIDANCE_URLS.recipes,
      method: 'GET',
    },
  ];
}

export interface BuildMcpCatalogActionsUrlOptions {
  sinceEtag?: string | null;
  delta?: boolean;
  hot?: boolean;
}

/** Build GET /mcp/actions URL (hot schemas + optional etag delta). */
export function buildMcpCatalogActionsUrl(
  apiBase: string,
  opts: BuildMcpCatalogActionsUrlOptions = {},
): string {
  const { sinceEtag = null, delta = false, hot = true } = opts;
  const origin = resolveMcpGuidanceUrl(apiBase, MCP_GUIDANCE_URLS.actions);
  const url = new URL(origin);
  if (hot) url.searchParams.set('schemas', 'hot');
  if (sinceEtag) url.searchParams.set('since_etag', sinceEtag);
  if (delta && sinceEtag) url.searchParams.set('delta', '1');
  return url.toString();
}

export interface McpCatalogDeltaPayload {
  domains?: Record<string, Array<{ action: string; removed?: boolean }>>;
  removed_actions?: string[];
}

/** Merge delta catalog body into a flat action list (plugin parity). */
export function mergeMcpCatalogDelta<T extends { action: string }>(
  existing: T[],
  delta: McpCatalogDeltaPayload,
): T[] {
  const byAction = new Map<string, T>();
  for (const row of existing) byAction.set(row.action, row);
  const removed = new Set(delta.removed_actions ?? []);
  for (const list of Object.values(delta.domains ?? {})) {
    for (const row of list) {
      if (!row?.action) continue;
      if (row.removed || removed.has(row.action)) byAction.delete(row.action);
      else byAction.set(row.action, row as T);
    }
  }
  for (const action of removed) byAction.delete(action);
  return [...byAction.values()];
}

/** GET /mcp/ai_prompt — contract (default for agents) or full session payload. */
export async function fetchMcpAiPrompt(
  opts: FetchMcpAiPromptOptions,
): Promise<McpAiPromptContract | Record<string, unknown>> {
  const mode = opts.mode ?? 'contract';
  const params = new URLSearchParams({ mode });
  const url = `${resolveMcpGuidanceUrl(opts.apiBase, MCP_GUIDANCE_URLS.aiPrompt)}?${params}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${opts.token}` },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(JSON.stringify(data));
  return data as McpAiPromptContract | Record<string, unknown>;
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
  hot?: boolean;
  sinceEtag?: string | null;
  delta?: boolean;
}

/** GET /mcp/actions — enriched MCP catalog (includes capability_descriptor slim rows). */
export async function mcpListActions(opts: McpListActionsOptions): Promise<unknown> {
  const url = buildMcpCatalogActionsUrl(opts.apiBase, {
    hot: opts.hot ?? true,
    sinceEtag: opts.sinceEtag ?? null,
    delta: opts.delta ?? false,
  });
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${opts.token}` },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(JSON.stringify(data));
  return data;
}

export interface RefreshMcpCatalogWithDeltaOptions {
  apiBase: string;
  token: string;
  existing: McpCatalogActionRow[];
  sinceEtag: string;
}

/** Fetch catalog delta and merge into existing flat action list. */
export async function refreshMcpCatalogWithDelta(
  opts: RefreshMcpCatalogWithDeltaOptions,
): Promise<{ actions: McpCatalogActionRow[]; catalogEtag?: string }> {
  const url = buildMcpCatalogActionsUrl(opts.apiBase, {
    sinceEtag: opts.sinceEtag,
    delta: true,
    hot: true,
  });
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${opts.token}`,
      'If-None-Match': `"${opts.sinceEtag}"`,
    },
  });
  if (res.status === 304) {
    return { actions: opts.existing, catalogEtag: opts.sinceEtag };
  }
  const data = (await res.json().catch(() => ({}))) as McpCatalogDeltaPayload & {
    catalog_etag?: string;
  };
  if (!res.ok) throw new Error(JSON.stringify(data));
  const etag = data.catalog_etag ?? opts.sinceEtag;
  const merged = mergeMcpCatalogDelta(opts.existing, data);
  return { actions: merged, catalogEtag: etag };
}

export interface RunMcpPreflightOptions {
  apiBase: string;
  token: string;
  projectId: number;
  requiredCaps?: string[];
}

/** Server-side preflight aggregator (GET /mcp/preflight). */
export async function fetchMcpPreflight(opts: RunMcpPreflightOptions): Promise<unknown> {
  const base = resolveMcpGuidanceUrl(opts.apiBase, MCP_GUIDANCE_URLS.preflight);
  const url = new URL(base);
  url.searchParams.set('project_id', String(opts.projectId));
  const caps = opts.requiredCaps ?? [];
  if (caps[0]) {
    url.searchParams.set('permission', caps[0]);
  }
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${opts.token}`, Accept: 'application/json' },
  });
  const payload = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    throw new Error(JSON.stringify(payload));
  }
  const data = (payload as { data?: Record<string, unknown> }).data ?? payload;
  if (data && typeof data === 'object') {
    return {
      ...payload,
      warnings: (data as Record<string, unknown>).warnings,
      blocking: (data as Record<string, unknown>).blocking,
      permissions: (data as Record<string, unknown>).permissions ?? (data as Record<string, unknown>).rbac,
    };
  }
  if (caps.length <= 1) {
    return payload;
  }
  const extra = await mcpExecute(
    caps.slice(1).map((cap, i) => ({
      id: `cap_${cap}`,
      action: 'rbac.check_permission',
      params: { permission: cap, project_id: opts.projectId },
    })),
    {
      token: opts.token,
      projectId: opts.projectId,
      mcpUrl: resolveMcpGuidanceUrl(opts.apiBase, MCP_GUIDANCE_URLS.mcp),
      stopOnError: false,
    },
  );
  return { ...payload, extra_rbac: extra };
}

/** Tenant mutation preflight — prefers GET /mcp/preflight (server SoT). */
export async function runMcpPreflight(opts: RunMcpPreflightOptions): Promise<unknown> {
  return fetchMcpPreflight(opts);
}

export interface FlowReceipt {
  flow_id?: string;
  project_id: number;
  env_uuid?: string | null;
  catalog_etag?: string;
  trace_ids: string[];
  tests: { passed: number; failed: number };
  gates: unknown[];
  recovery: { checkpoint_id?: string | null };
  final_state: 'completed' | 'blocked' | 'aborted' | 'rolled_back';
  audit_actions?: string[];
  revision?: string | null;
  partial_success?: boolean;
  succeeded_count?: number;
  failed_step_ids?: string[];
}

/** Build compact ops handoff receipt (distinct from AgentNet economy receipts). */
export function buildFlowReceipt(partial: Partial<FlowReceipt> & { project_id: number }): FlowReceipt {
  return {
    flow_id: partial.flow_id,
    project_id: partial.project_id,
    env_uuid: partial.env_uuid ?? null,
    catalog_etag: partial.catalog_etag,
    trace_ids: partial.trace_ids ?? [],
    tests: partial.tests ?? { passed: 0, failed: 0 },
    gates: partial.gates ?? [],
    recovery: partial.recovery ?? { checkpoint_id: null },
    final_state: partial.final_state ?? 'blocked',
    audit_actions: partial.audit_actions ?? [],
    revision: partial.revision ?? null,
    partial_success: partial.partial_success,
    succeeded_count: partial.succeeded_count,
    failed_step_ids: partial.failed_step_ids,
  };
}

export const MCP_CERTIFICATION_RECIPE_ID = 'mcp_agent_certification_v1';

/** Run full agent certification recipe and return FlowReceipt + execute result. */
export async function runMcpCertificationRecipe(opts: {
  apiBase: string;
  token: string;
  projectId: number;
  idempotencyKey?: string;
}): Promise<{ receipt: FlowReceipt; execute: McpExecuteResult }> {
  const res = await mcpExecute([], {
    token: opts.token,
    projectId: opts.projectId,
    mcpUrl: resolveMcpGuidanceUrl(opts.apiBase, MCP_GUIDANCE_URLS.mcp),
    recipeId: MCP_CERTIFICATION_RECIPE_ID,
    idempotencyKey: opts.idempotencyKey,
    stopOnError: false,
  });
  const raw =
    res.raw && typeof res.raw === 'object'
      ? (res.raw as Record<string, unknown>)
      : {};
  const inner = (raw.result as Record<string, unknown> | undefined) ?? raw;
  const envelope: Record<string, unknown> = {
    ...inner,
    ok: res.ok,
    partial_success: res.partial_success,
    succeeded_count: res.succeeded_count,
    failed_step_ids: res.failed_step_ids,
    steps: Array.isArray(inner.steps) ? inner.steps : raw.steps,
  };
  const receipt = buildCertificationReceipt(envelope, opts.projectId);
  return { receipt, execute: res };
}

/** Certification handoff — wraps execute batch output into a FlowReceipt. */
export function buildCertificationReceipt(
  executeResult: Record<string, unknown>,
  projectId: number,
): FlowReceipt {
  const steps = Array.isArray(executeResult.steps) ? executeResult.steps : [];
  const failed = steps.filter(
    (s) => typeof s === 'object' && s !== null && (s as { status?: string }).status === 'error',
  );
  const traceId = typeof executeResult.trace_id === 'string' ? executeResult.trace_id : undefined;
  return buildFlowReceipt({
    flow_id: 'mcp_agent_certification_v1',
    project_id: projectId,
    catalog_etag: typeof executeResult.catalog_etag === 'string' ? executeResult.catalog_etag : undefined,
    trace_ids: traceId ? [traceId] : [],
    tests: { passed: steps.length - failed.length, failed: failed.length },
    final_state: executeResult.ok || executeResult.partial_success ? 'completed' : 'blocked',
    partial_success: Boolean(executeResult.partial_success),
    succeeded_count:
      typeof executeResult.succeeded_count === 'number' ? executeResult.succeeded_count : undefined,
    failed_step_ids: Array.isArray(executeResult.failed_step_ids)
      ? (executeResult.failed_step_ids as string[])
      : undefined,
  });
}

export interface DiscoveryStatusNextAction {
  action: string;
  why?: string;
  params_hint?: Record<string, unknown>;
}

export interface DiscoveryStatusDomainSlice {
  id: string;
  actions_count: number;
  sample_actions?: string[];
}

export interface DiscoveryStatusPayload {
  registry_version?: string;
  registry_revision?: string;
  schema_version?: string;
  actions_total?: number;
  domains_total?: number;
  domains?: DiscoveryStatusDomainSlice[];
  recipes_total?: number;
  catalog_etag?: string;
  generated_at?: string;
  instruction_slice?: {
    ladder_step?: number;
    when_to_use?: string;
    next_actions?: DiscoveryStatusNextAction[];
    recommended_recipe?: string;
    compass_playbook_id?: string;
    ui_hints?: Record<string, string>;
  };
}

/** MCP discovery.status (registry totals + version). */
export async function fetchDiscoveryStatus(opts: {
  apiBase: string;
  token: string;
  projectId?: number;
}): Promise<DiscoveryStatusPayload> {
  const res = await mcpExecute(
    [{ id: 'status', action: 'discovery.status', params: {} }],
    {
      token: opts.token,
      projectId: opts.projectId ?? 1,
      mcpUrl: resolveMcpGuidanceUrl(opts.apiBase, MCP_GUIDANCE_URLS.mcp),
      stopOnError: true,
    },
  );
  const first = res.results[0];
  const payload = first?.result;
  const data =
    payload && typeof payload === 'object' && 'data' in (payload as object)
      ? (payload as { data?: DiscoveryStatusPayload }).data
      : (payload as DiscoveryStatusPayload | undefined);
  if (!data) {
    throw new Error('discovery.status returned no data');
  }
  return data;
}
