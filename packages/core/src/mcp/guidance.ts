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
  closedLoopAutonomy: 'agentstack_closed_loop_autonomy',
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
  'hosted_site_edit',
  'bot_channel',
  'showcase_portfolio_storefront',
  'migrate_legacy',
  'hosted_vertical_saas',
  'service_business',
  'ai_product',
  'marketplace',
  'internal_tool',
  'community',
  'key2unity_auth_portal',
  'support_bot',
  'knowledge_assistant',
  'agency',
  'freelancer',
  'content_site',
] as const;

export type ProductArchetypeId = (typeof PRODUCT_ARCHETYPE_IDS)[number];

export const MCP_ONBOARDING_RECIPE_IDS = [
  'mcp_session_setup',
  'mcp_work_loop_v1',
  'mcp_read_bootstrap',
  'mcp_hosting_quickstart',
  'mcp_integrations_checkout_crm',
  'mcp_agents_run_approve',
  'mcp_agents_fleet_orient',
  'mcp_agents_create_from_template',
  'mcp_knowledge_ingest',
  'mcp_knowledge_answer_tune',
  'mcp_knowledge_acceptance_promote',
  'mcp_crm_contact_deal',
  'mcp_hosted_vertical_bootstrap',
  'mcp_support_inbox',
  'mcp_support_respond_v1',
  'mcp_analyst_readonly_v1',
  'mcp_integration_ops_v1',
  'mcp_integrations_universal_connect_v1',
  'mcp_content_writer_v1',
  'mcp_business_composite_v1',
  'mcp_bots_simulate',
  'mcp_generation_diff',
  'mcp_universal_safe_change',
  'mcp_bot_ai_release',
  'mcp_hosting_edit_site_safe',
  'mcp_hosting_edit_text_file_v1',
  'mcp_hosting_static_landing_v1',
  'mcp_site_growth_v1',
  'mcp_notify_channels_v1',
  'mcp_platform_flows_v1',
  'mcp_hosting_react_dist_v1',
  'mcp_project_data_safe_patch',
  'mcp_user_access_safe',
  'mcp_project_operator_session',
  'mcp_agent_knowledge_memory_setup',
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

/**
 * MCP discovery ladder URLs (parity with ``instruction_plane.discovery_ladder_steps`` /
 * onboarding bundle ``machine_discovery_ladder``). HTTP bootstrap: ``http_bootstrap_ladder``.
 */
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
    { phase: 4, id: 'domain_work', title: 'Work Graph loop', recipeId: 'mcp_work_loop_v1' },
  ];
}

export interface McpDiscoveryLadderStep {
  step: number;
  label: string;
  url: string;
  method: string;
}

export interface McpHttpBootstrapLadderStep {
  step: number;
  label: string;
  url: string;
  method: string;
}

export interface McpClosedLoopLadderStep {
  step: number;
  stepId: string;
  label: string;
  detail: string;
}

/** Parity with onboarding bundle ``closed_loop_ladder``. */
export function closedLoopLadderSteps(): McpClosedLoopLadderStep[] {
                                                    return [
    {
      step: 0,
      stepId: 'session',
      label: 'Session + project',
      detail: '/mcp/prompts/get?name=agentstack_session_setup — bind context.project_id',
    },
    {
      step: 1,
      stepId: 'route',
      label: 'Route goal',
      detail: 'Cold start: no project_id → agentstack_session_setup only. Do not discovery.search until context.project_id is set. Bound project: agents.work_next first; discovery.search only when packet.next_action is absent. Status-only poll → agents.work_status (no claim params).',
    },
    {
      step: 2,
      stepId: 'plan_read',
      label: 'Plan read + sandbox',
      detail: 'agents.plan_get — include_execution_eligibility=true; optional env_uuid for sandbox slice',
    },
    {
      step: 3,
      stepId: 'work_pick',
      label: 'Pick next work',
      detail: 'agents.work_next — read dependency_ready (structural) vs execution_ready (fleet) separately; blocked_work.execution_summary + instruction_packet.execution_summary; dependency_ready=false → wait deps; execution_ready=false with deps ok → provision before claim',
    },
    {
      step: 4,
      stepId: 'plan_draft',
      label: 'Draft / decompose (optional)',
      detail: 'agents.plan_propose → validation.plan_valid + execution.execution_summary → agents.plan_apply_proposal (same env_uuid and validation_mode); persist_unexecutable for intake-only (H8); plan_process_backlog auto_apply=off; facet_repair bounded max 2 (H9); planning_artifact evidence-only (H10)',
    },
    {
      step: 5,
      stepId: 'claim_execute',
      label: 'Claim + execute',
      detail: 'agents.plan_claim — CAS revision; role_mismatch → handoff not retry loop → agents.plan_execute — only after claim; attach evidence for completion_predicates; ensure_agent create=false then create=true when provision_required (H5/H7)',
    },
    {
      step: 6,
      stepId: 'verify_recover',
      label: 'Verify + recover',
      detail: 'completion not_evaluable ≠ passed; verification_failed → agents.plan_recovery_scan — verification_failed candidates + stale claims; optional env_uuid; agents.plan_propose mode=repair_plan — target node_id; allow_generic_acceptance repair-only; agents.plan_apply_proposal — same env_uuid as propose on sandbox forks; agents.work_next handoff=true node_id=… — re-resolve after repair or provision; diagnostics reconcile',
    },
    {
      step: 7,
      stepId: 'business_team',
      label: 'Business / team (optional)',
      detail: '/mcp/prompts/get?name=agentstack_business_organism for head+organs; agents.team.create + templates for specialist fleet',
    },
  ];
}

/** Harness H6–H11 — parity with agentstack_closed_loop_autonomy + WAVE_XIX atoms. */
export const WORK_GRAPH_HARNESS_INVARIANTS = [
  {
    id: 'H6',
    atom: 'WG_CAPABILITY_HARD_GATE',
    summary: "required_capabilities are mandatory — capability_mismatch blocks claim; route agents.ensure_agent create=false (H5) then create=true, or plan_propose mode=repair_plan; not handoff (capability_hard_gate_v1).",
  },
  {
    id: 'H7',
    atom: 'WG_ENSURE_CREATE_SAGA',
    summary: "Commit-last provision: work_next blocked → ensure_agent create=false (H5 template_id) → create=true provisions with bind_node=False → eligibility gate → rollback on created_agent_not_eligible → next_action agents.plan_claim (bind+lease, if_match_revision); idempotent_replay when bound eligible agent exists.",
  },
  {
    id: 'H8',
    atom: 'WG_PLANNER_PLANE',
    summary: "Backlog scan uses planner eligibility (decomposition_status=needed) — not execution_ready; validation_ok reflects plan_valid (structural+semantic), not fleet gaps.",
  },
  {
    id: 'H9',
    atom: 'WG_FACET_REPAIR',
    summary: "plan_propose runs ensure_proposal_facet_coverage (facet_repair, max 2 passes) after enrich for create_plan and decompose_node (including from_draft_tree meta under create_plan) — do not hand-patch semantic facet children; for facet gaps after other modes use mode=repair_plan.",
  },
  {
    id: 'H10',
    atom: 'WG_PLANNING_ARTIFACT',
    summary: "meta.planning_artifact nodes are evidence-only (resolution=non_executable_artifact) — attach evidence on parent; plan_process_backlog and claim skip them for execution.",
  },
  {
    id: 'H11',
    atom: 'WG_BIND_VS_CLAIM',
    summary: "node.agent_id binding ≠ active claim lease — already_claimed requires status=in_progress with non-expired lease meta; bound agent on ready/pending is not already_claimed; retry ensure_agent idempotent_replay or plan_claim with if_match_revision.",
  },
] as const;

/** agents.work_next when_blocked — parity with shared/fixtures/capabilities/agents.json */
export const WORK_GRAPH_WHEN_BLOCKED = {
  provision_required: "ensure_agent create=false (H5) then create=true then plan_claim",
  no_compatible_agent: "agents.ensure_agent create=false (H5) then create=true, or plan_propose mode=repair_plan",
  planning_required: "agents.plan_propose mode=create_plan or decompose_node — strategic/decomposition node, not execution",
  planning_blocked: "agents.plan_propose mode=decompose_node or plan_process_backlog — finish planner plane first",
  dependency_blocked: "dependency_ready=false — wait deps; do not ensure_agent",
  role_mismatch: "work_next handoff=true node_id=… — do not retry same agent",
  specialization_mismatch: "work_next handoff=true — follow recovery.next_actions",
  capability_mismatch: "agents.ensure_agent create=false (H5) then create=true, or plan_propose mode=repair_plan",
  verification_failed: "agents.plan_recovery_scan → plan_propose mode=repair_plan",
  fully_provisionable: "ensure_agent create=false (H5) then create=true (preferred over create_from_template)",
  supersede_in_progress: "agents.plan_get then wait/retry — in-progress node cannot be superseded without options.force_supersede_in_progress (retryable)",
  planner_duplicate_children: "agents.plan_get — semantic facet children already exist; re-propose is a no-op or use mode=replan_subtree",
  plan_revision_conflict: "agents.plan_get reload if_match_revision; retry claim/apply (retryable)",
  expired_claim: "agents.plan_reclaim_stale — lease expired; do not treat as dependency_blocked",
  wip_full: "Agent WIP cap reached — agents.plan_get then complete/release in_progress claims; retry plan_claim",
  terminal: "agents.work_next — skip terminal node; pick another leaf (completed/cancelled not claimable)",
  waiting_input: "agents.work_next — ask_user recovery; do not plan_claim until operator input arrives",
  waiting_approval: "agents.work_next — wait approval gate; agents.plan_get to inspect approval meta",
  decomposition_blocked: "agents.plan_propose mode=decompose_node — parent has open decomposition children",
  already_claimed: "agents.work_next — check in_progress lease (H11); handoff if wrong agent; plan_reclaim_stale if stale",
  skill_mismatch: "agents.work_next handoff=true — skill_ids mismatch; follow recovery.next_actions",
  missing_capability: "agents.ensure_agent create=false (H5) then create=true, or plan_propose mode=repair_plan",
  internal_execution_error: "agents.plan_recovery_scan → plan_propose mode=repair_plan; retry after catalog refresh",
  created_agent_not_eligible: "Provision rolled back — plan_propose mode=repair_plan or pick template with matching caps (H5)",
  ensure_agent_stamp_mismatch: "Replay create=false preview; create=true must match preview_template_id + graph_revision",
} as const

/** agents.work_next when_blocked trilingual — parity with work_graph_instruction_atoms */
export const WORK_GRAPH_WHEN_BLOCKED_LOCALES = {
  "planning_required": {
    "en-US": "Plan first — agents.plan_propose mode=create_plan or decompose_node (not execution)",
    "ru-RU": "Сначала план — agents.plan_propose mode=create_plan или decompose_node (не execution)",
    "pt-BR": "Planeje primeiro — agents.plan_propose mode=create_plan ou decompose_node (não execução)",
  },
  "provision_required": {
    "en-US": "Provision — agents.ensure_agent create=false (H5) then create=true, then plan_claim",
    "ru-RU": "Провижн — agents.ensure_agent create=false (H5) затем create=true, затем plan_claim",
    "pt-BR": "Provisione — agents.ensure_agent create=false (H5) depois create=true, então plan_claim",
  },
  "no_compatible_agent": {
    "en-US": "No fleet match — agents.ensure_agent create=false (H5) then create=true, or repair_plan",
    "ru-RU": "Нет агента во флоте — agents.ensure_agent create=false (H5) затем create=true или repair_plan",
    "pt-BR": "Sem agente na frota — agents.ensure_agent create=false (H5) depois create=true ou repair_plan",
  },
  "capability_mismatch": {
    "en-US": "Missing required_capabilities — agents.ensure_agent create=false (H5) then create=true, or plan_propose mode=repair_plan. Not handoff.",
    "ru-RU": "Нет required_capabilities — agents.ensure_agent create=false (H5) затем create=true, или plan_propose mode=repair_plan. Не handoff.",
    "pt-BR": "required_capabilities ausentes — agents.ensure_agent create=false (H5) depois create=true, ou plan_propose mode=repair_plan. Não é handoff.",
  },
  "fully_provisionable": {
    "en-US": "Template ready — agents.ensure_agent create=false (H5) then create=true (preferred over create_from_template)",
    "ru-RU": "Шаблон готов — agents.ensure_agent create=false (H5) затем create=true (предпочтительнее create_from_template)",
    "pt-BR": "Template pronto — agents.ensure_agent create=false (H5) depois create=true (preferido a create_from_template)",
  },
  "plan_revision_conflict": {
    "en-US": "CAS conflict — agents.plan_get reload if_match_revision; never apply stale proposal",
    "ru-RU": "CAS конфликт — agents.plan_get перечитать if_match_revision; не apply устаревший proposal",
    "pt-BR": "Conflito CAS — agents.plan_get recarregue if_match_revision; nunca apply proposal obsoleto",
  },
  "expired_claim": {
    "en-US": "Stale lease — agents.plan_reclaim_stale, then plan_claim with a fresh if_match_revision",
    "ru-RU": "Истёк lease — agents.plan_reclaim_stale, затем plan_claim с новым if_match_revision",
    "pt-BR": "Lease expirado — agents.plan_reclaim_stale, depois plan_claim com if_match_revision novo",
  },
  "supersede_in_progress": {
    "en-US": "In-progress supersede blocked — agents.plan_get, wait/retry (or force_supersede_in_progress)",
    "ru-RU": "Supersede in_progress заблокирован — agents.plan_get, wait/retry (или force_supersede_in_progress)",
    "pt-BR": "Supersede in_progress bloqueado — agents.plan_get, aguarde/retry (ou force_supersede_in_progress)",
  },
  "planner_duplicate_children": {
    "en-US": "Duplicate facet children — agents.plan_get; skip re-propose or use mode=replan_subtree",
    "ru-RU": "Дубли facet children — agents.plan_get; не re-propose или mode=replan_subtree",
    "pt-BR": "Filhos facet duplicados — agents.plan_get; pule re-propose ou use mode=replan_subtree",
  },
  "dependency_blocked": {
    "en-US": "Wait on deps — agents.work_next after upstream finishes; agents.plan_get to inspect graph; do not ensure_agent",
    "ru-RU": "Дождитесь deps — agents.work_next после upstream; agents.plan_get для просмотра графа; не ensure_agent",
    "pt-BR": "Aguarde deps — agents.work_next após upstream; agents.plan_get para inspecionar o grafo; não ensure_agent",
  },
  "role_mismatch": {
    "en-US": "Handoff — agents.work_next handoff=true node_id=…; follow recovery.next_actions; do not retry same agent",
    "ru-RU": "Handoff — agents.work_next handoff=true node_id=…; следуйте recovery.next_actions; не повторяйте того же агента",
    "pt-BR": "Handoff — agents.work_next handoff=true node_id=…; siga recovery.next_actions; não repita o mesmo agente",
  },
  "specialization_mismatch": {
    "en-US": "Specialization mismatch — agents.work_next handoff=true; follow recovery.next_actions",
    "ru-RU": "Несовпадение специализации — agents.work_next handoff=true; следуйте recovery.next_actions",
    "pt-BR": "Especialização incompatível — agents.work_next handoff=true; siga recovery.next_actions",
  },
  "planning_blocked": {
    "en-US": "Planner plane blocked — agents.plan_propose mode=decompose_node or plan_process_backlog first",
    "ru-RU": "Планер заблокирован — сначала agents.plan_propose mode=decompose_node или plan_process_backlog",
    "pt-BR": "Plano bloqueado — agents.plan_propose mode=decompose_node ou plan_process_backlog primeiro",
  },
  "verification_failed": {
    "en-US": "Verification failed — agents.plan_recovery_scan → plan_propose mode=repair_plan",
    "ru-RU": "Верификация не прошла — agents.plan_recovery_scan → plan_propose mode=repair_plan",
    "pt-BR": "Verificação falhou — agents.plan_recovery_scan → plan_propose mode=repair_plan",
  },
  "wip_full": {
    "en-US": "WIP cap — complete/release in_progress claims; agents.plan_get then retry plan_claim",
    "ru-RU": "Лимит WIP — завершите/освободите in_progress; agents.plan_get затем plan_claim",
    "pt-BR": "Cap WIP — conclua/libere claims in_progress; agents.plan_get depois plan_claim",
  },
  "terminal": {
    "en-US": "Terminal node — agents.work_next skip; not claimable (completed/cancelled)",
    "ru-RU": "Терминальный узел — agents.work_next пропустить; не claimable",
    "pt-BR": "Nó terminal — agents.work_next pule; não claimable (concluído/cancelado)",
  },
  "waiting_input": {
    "en-US": "Waiting input — agents.work_next ask_user; no plan_claim until operator responds",
    "ru-RU": "Ожидание ввода — agents.work_next ask_user; без plan_claim до ответа оператора",
    "pt-BR": "Aguardando entrada — agents.work_next ask_user; sem plan_claim até resposta",
  },
  "waiting_approval": {
    "en-US": "Waiting approval — agents.work_next wait gate; agents.plan_get inspect approval meta",
    "ru-RU": "Ожидание approval — agents.work_next wait; agents.plan_get для meta approval",
    "pt-BR": "Aguardando aprovação — agents.work_next aguarde; agents.plan_get inspecione meta",
  },
  "decomposition_blocked": {
    "en-US": "Decompose first — agents.plan_propose mode=decompose_node on parent",
    "ru-RU": "Сначала decompose — agents.plan_propose mode=decompose_node на parent",
    "pt-BR": "Decomponha primeiro — agents.plan_propose mode=decompose_node no parent",
  },
  "already_claimed": {
    "en-US": "In progress lease — agents.work_next (H11); handoff or plan_reclaim_stale if stale",
    "ru-RU": "Lease in_progress — agents.work_next (H11); handoff если чужой агент; plan_reclaim_stale только если lease протух",
    "pt-BR": "Lease in_progress — agents.work_next (H11); handoff se o agente for outro; plan_reclaim_stale só se expirado",
  },
  "skill_mismatch": {
    "en-US": "Skill mismatch — agents.work_next handoff=true; follow recovery.next_actions",
    "ru-RU": "Skill mismatch — agents.work_next handoff=true; следуйте recovery.next_actions",
    "pt-BR": "Skill mismatch — agents.work_next handoff=true; siga recovery.next_actions",
  },
  "missing_capability": {
    "en-US": "Missing caps — agents.ensure_agent create=false (H5) then create=true, or plan_propose mode=repair_plan",
    "ru-RU": "Нет caps — agents.ensure_agent create=false (H5) затем create=true, или plan_propose mode=repair_plan",
    "pt-BR": "Caps ausentes — agents.ensure_agent create=false (H5) depois create=true, ou plan_propose mode=repair_plan",
  },
  "internal_execution_error": {
    "en-US": "Resolver error — agents.plan_recovery_scan → repair_plan; refresh catalog then retry",
    "ru-RU": "Ошибка resolver — agents.plan_recovery_scan → repair_plan; обновите каталог, затем retry",
    "pt-BR": "Erro resolver — agents.plan_recovery_scan → repair_plan; atualize o catálogo e então retry",
  },
  "created_agent_not_eligible": {
    "en-US": "Rollback — plan_propose mode=repair_plan or template with matching caps (H5)",
    "ru-RU": "Rollback — plan_propose mode=repair_plan или шаблон с caps (H5)",
    "pt-BR": "Rollback — plan_propose mode=repair_plan ou template com caps (H5)",
  },
  "ensure_agent_stamp_mismatch": {
    "en-US": "Stamp mismatch — replay create=false; create=true must match preview + revision",
    "ru-RU": "Stamp mismatch — повторите create=false; create=true = preview + revision",
    "pt-BR": "Stamp mismatch — repita create=false; create=true = preview + revision",
  },
} as const

/** Platform-plane Wave XIX atoms trilingual — parity with WAVE_XIX_ATOM_LOCALES */
export const WAVE_XIX_ATOM_LOCALES = {
  "WG_STORAGE_NOT_KNOWLEDGE": {
    "en-US": "File upload / document persistence → storage.* (MCP operator or REST binary upload). Do not ingest to knowledge unless the goal requests RAG/Q&A/semantic search.",
    "ru-RU": "Загрузка файлов → storage.* (MCP оператор или REST). Не индексируй в knowledge без явного запроса RAG/семантического поиска.",
    "pt-BR": "Upload de arquivo → storage.* (MCP operador ou REST). Não ingerir em knowledge salvo pedido RAG/busca semântica.",
  },
  "WG_MCP_SDK_REST_PLANE": {
    "en-US": "MCP: operator/agent configure + work graph. SDK: app runtime integration. REST: binary transfer or capability not in SDK. Never duplicate platform CRM/Auth/Storage.",
    "ru-RU": "MCP: оператор/агент + work graph. SDK: runtime приложения. REST: бинарные загрузки или возможности вне SDK. Не дублируй CRM/Auth/Storage платформы.",
    "pt-BR": "MCP: operador/config + work graph. SDK: runtime do app. REST: binário ou capacidade fora do SDK. Nunca duplique CRM/Auth/Storage da plataforma.",
  },
  "WG_GRAPH_FOR_DURABLE_WORK": {
    "en-US": "Durable work (more than one read) enters the Work Graph: agents.plan_propose (create_plan or decompose_node), agents.plan_apply_proposal when validation.safe_to_auto_apply, then agents.work_next following next_action until state=idle, blocked, or recoverable. A single domain call (one CRM write, one file upload, discovery.search, auth.get_profile) stays a direct MCP action. Do not mark a node complete from prose — attach meta.verify_after_write_action evidence. Idle with an empty graph is valid.",
    "ru-RU": "Долгая работа (дольше одного чтения) входит в Work Graph: agents.plan_propose (create_plan или decompose_node), agents.plan_apply_proposal при validation.safe_to_auto_apply, затем agents.work_next и next_action до state=idle, blocked или recoverable. Один доменный вызов (один контакт CRM, одна загрузка файла, discovery.search, auth.get_profile) остаётся прямым MCP. Не помечайте узел выполненным из текста — приложите доказательство meta.verify_after_write_action. Пустой граф — валидный idle.",
    "pt-BR": "Trabalho durável (mais que uma leitura) entra no Work Graph: agents.plan_propose (create_plan ou decompose_node), agents.plan_apply_proposal quando validation.safe_to_auto_apply, depois agents.work_next seguindo next_action até state=idle, blocked ou recoverable. Uma chamada de domínio (um contato CRM, um upload, discovery.search, auth.get_profile) continua MCP direto. Não marque o nó completo pelo texto — anexe evidência meta.verify_after_write_action. Grafo vazio é idle válido.",
  },
  "WG_VERIFY_AFTER_WRITE": {
    "en-US": "After each platform mutation, verify via canonical read on meta.verify_after_write_action (storage.list_files, crm.list_contacts, logic.dry_run, rag.search) — attach evidence, do not mark complete from agent prose alone.",
    "ru-RU": "После мутации платформы — каноническое чтение meta.verify_after_write_action (storage.list_files, crm.list_contacts, logic.dry_run, rag.search); прикрепи evidence, не завершай по тексту агента.",
    "pt-BR": "Após mutação, verifique via leitura canônica meta.verify_after_write_action (storage.list_files, crm.list_contacts, logic.dry_run, rag.search) — anexe evidência, não marque completo só pelo texto do agente.",
  },
} as const;

/**
 * HTTP bootstrap ladder — contract → manifest → organs → public catalog schemas.
 * Parity with ``instruction_plane.http_bootstrap_ladder()`` / onboarding ``http_bootstrap_ladder``.
 */
export function httpBootstrapLadderSteps(apiBase = ''): McpHttpBootstrapLadderStep[] {
  const aiPrompt = resolveMcpGuidanceUrl(apiBase, MCP_GUIDANCE_URLS.aiPrompt);
  const manifest = resolveMcpGuidanceUrl(apiBase, MCP_GUIDANCE_URLS.manifest);
  const organs = resolveMcpGuidanceUrl(apiBase, MCP_GUIDANCE_URLS.organs);
  const actionsPublic = buildMcpCatalogActionsUrl(apiBase, { hot: false });
  return [
    {
      step: 0,
      label: 'Contract (slim)',
      url: `${aiPrompt}?mode=contract`,
      method: 'GET',
    },
    {
      step: 1,
      label: 'Server manifest',
      url: manifest,
      method: 'GET',
    },
    {
      step: 2,
      label: 'Organs map',
      url: organs,
      method: 'GET',
    },
    {
      step: 3,
      label: 'Public catalog schemas',
      url: actionsPublic,
      method: 'GET',
    },
  ];
}

/** Parity with onboarding bundle ``discovery_ladder`` (relative paths). */
export function discoveryLadderSteps(): McpDiscoveryLadderStep[] {
          return [
    {
      step: 0,
      label: 'Session probe',
      url: `${MCP_GUIDANCE_URLS.promptGet}?name=agentstack_session_setup`,
      method: 'GET',
    },
    {
      step: 1,
      label: 'Work Graph default (bound project)',
      url: 'agents.work_next',
      method: 'MCP',
    },
    {
      step: 2,
      label: 'Registry status',
      url: 'discovery.status',
      method: 'MCP',
    },
    {
      step: 3,
      label: 'Schema lookup only — prefer packet.next_action',
      url: 'discovery.search',
      method: 'MCP',
    },
    {
      step: 4,
      label: 'Describe chosen action',
      url: 'discovery.describe',
      method: 'MCP',
    },
    {
      step: 5,
      label: 'Preflight then execute',
      url: 'preflight.check',
      method: 'MCP',
    },
  ];
}

/** Unified discovery.search response (parity with discovery_search_facade). */
export interface DiscoverySearchRecipeMatch {
  id: string;
  name?: string;
  category?: string;
  score?: number;
}

/** GTPI admin debug slice (discovery.search / discover/by_intent when tokens param set). */
export interface GtpiDebugBinding {
  binding_id?: string;
  genetic_tag?: string;
  entity_key?: string;
  score?: number;
}

export interface GtpiDebugPayload {
  tokens?: string[];
  bindings?: GtpiDebugBinding[];
}

/** Product archetype row from instruction_plane.match_product_archetypes */
export interface ProductArchetypeMatch {
  id: ProductArchetypeId | string;
  name?: string;
  mcp_recipe_id?: string | null;
  flow_id?: string | null;
  sdk_hint?: string | null;
  signals?: string[];
}

export interface DiscoverySearchResult {
  catalog_scope?: string;
  registry_total?: number;
  public_total?: number;
  principal_visible_total?: number;
  query?: string | null;
  actions?: McpCatalogActionRow[];
  total_matched?: number;
  next_cursor?: string | null;
  catalog_etag?: string;
  intents?: unknown[];
  product_archetypes?: ProductArchetypeMatch[];
  recommended_archetype?: string | null;
  recommended_recipe?: string | null;
  supporting_recipes?: string[];
  recipe_matches?: DiscoverySearchRecipeMatch[];
  requires_project?: boolean;
  requires_generation?: boolean;
  source?: string;
  gtpi_debug?: GtpiDebugPayload;
}

export interface BuildMcpCatalogActionsUrlOptions {
  sinceEtag?: string | null;
  delta?: boolean;
  hot?: boolean;
}

/**
 * Build GET /mcp/actions URL (default `schemas=public`; pass `hot: true` for hot schemas).
 * Delta: `since_etag` + `delta=1` — server may return `delta_fallback: revision_unknown` (full body).
 * Echo response header `X-AgentStack-Cache-Epoch` on subsequent catalog fetches after cache clear.
 */
export function buildMcpCatalogActionsUrl(
  apiBase: string,
  opts: BuildMcpCatalogActionsUrlOptions = {},
): string {
  const { sinceEtag = null, delta = false, hot = false } = opts;
  const origin = resolveMcpGuidanceUrl(apiBase, MCP_GUIDANCE_URLS.actions);
  const url = new URL(origin);
  if (hot) url.searchParams.set('schemas', 'hot');
  else url.searchParams.set('schemas', 'public');
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
export type McpActionsSummary = {
  total_actions: number;
  catalog_actions_public?: number;
  domains_public?: number;
  registry_tools?: number;
  registry_total?: number;
  version?: string;
  entrypoint?: string;
};

/** Read a public MCP resource via JSON-RPC resources/read (no auth). */
export async function readPublicMcpResource(
  apiBase: string,
  uri: string,
): Promise<Record<string, unknown>> {
  const root = String(apiBase || '').replace(/\/$/, '');
  const mcpUrl = root.endsWith('/mcp') ? root : `${root}/mcp`;
  const res = await fetch(mcpUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 'resource-read',
      method: 'resources/read',
      params: { uri },
    }),
  });
  const data = (await res.json().catch(() => ({}))) as {
    result?: { contents?: Array<{ text?: string }> };
    error?: unknown;
  };
  if (!res.ok || data.error) throw new Error(JSON.stringify(data));
  const text = data.result?.contents?.[0]?.text;
  if (!text) return {};
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return { text };
  }
}

/** Convenience readers for well-known public resources. */
export async function readPublicMcpOnboardingBundle(
  apiBase: string,
): Promise<Record<string, unknown>> {
  return readPublicMcpResource(apiBase, 'agentstack://instructions/session');
}

export async function readPublicMcpWorkGraphLadder(
  apiBase: string,
): Promise<Record<string, unknown>> {
  return readPublicMcpResource(apiBase, 'agentstack://instructions/work-graph');
}

export async function fetchMcpActionsSummary(apiBase: string): Promise<McpActionsSummary> {
  const origin = resolveMcpGuidanceUrl(apiBase, MCP_GUIDANCE_URLS.actionsSummary);
  const res = await fetch(origin);
  const data = (await res.json().catch(() => ({}))) as McpActionsSummary & {
    total_actions?: number;
  };
  if (!res.ok) throw new Error(JSON.stringify(data));
  return {
    total_actions: Number(data.total_actions ?? 0),
    catalog_actions_public: data.catalog_actions_public,
    domains_public: data.domains_public,
    registry_tools: data.registry_tools,
    registry_total: data.registry_total,
    version: data.version,
    entrypoint: data.entrypoint,
  };
}

/** Normalized catalog facts for marketing UI and CLI consumers. */
export type McpCatalogFacts = {
  publicActions: number;
  totalActions: number;
  domainsPublic?: number;
  registryTools?: number;
};

/** GET /mcp/actions/summary — convenience wrapper with stable field names. */
export async function getMcpCatalogFacts(apiBase: string): Promise<McpCatalogFacts> {
  const summary = await fetchMcpActionsSummary(apiBase);
  const publicActions = Number(
    summary.catalog_actions_public ?? summary.total_actions ?? 0,
  );
  return {
    publicActions,
    totalActions: Number(summary.total_actions ?? publicActions),
    domainsPublic: summary.domains_public,
    registryTools: summary.registry_tools ?? summary.registry_total,
  };
}

/** Marketing slot: floor÷50 on public catalog (ADR MCP_MARKETING_SHORTHAND_POLICY). */
export function formatMcpCatalogShorthandSocial(publicActions: number): string {
  const base = Math.floor(publicActions / 50) * 50;
  return `${base}+`;
}

/** Marketing slot: floor÷10 on public catalog (SEO / JSON-LD). */
export function formatMcpCatalogShorthandSeo(publicActions: number): string {
  const base = Math.floor(publicActions / 10) * 10;
  return `${base}+`;
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
    hot: opts.hot ?? false,
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
    hot: false,
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
  /** Optional MCP action for risk/effect probe (parity with preflight.check). */
  action?: string;
  actionParams?: Record<string, unknown>;
  pathUpdates?: Array<Record<string, unknown>>;
  publishAsked?: boolean;
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
  if (opts.action) {
    url.searchParams.set('action', opts.action);
  }
  if (opts.actionParams && Object.keys(opts.actionParams).length > 0) {
    url.searchParams.set('action_params', JSON.stringify(opts.actionParams));
  }
  if (opts.pathUpdates && opts.pathUpdates.length > 0) {
    url.searchParams.set('path_updates', JSON.stringify(opts.pathUpdates));
  }
  if (opts.publishAsked) {
    url.searchParams.set('publish_asked', 'true');
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
  workflow_run_id?: string;
  completed?: string[];
  verified?: string[];
  live_urls?: string[];
  pending?: string[];
  warnings?: string[];
  quality_profiles?: string[];
  quality_gates?: Array<{ id: string; status: string; gap?: string }>;
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
    workflow_run_id: partial.workflow_run_id,
    completed: partial.completed ?? [],
    verified: partial.verified ?? [],
    live_urls: partial.live_urls ?? [],
    pending: partial.pending ?? [],
    warnings: partial.warnings ?? [],
    quality_profiles: partial.quality_profiles,
    quality_gates: partial.quality_gates,
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
  /** e.g. rest_catalog_domain — REST-only rows, not MCP execute. */
  note?: string;
}

export interface DiscoveryStatusPayload {
  catalog_scope?: string;
  registry_total?: number;
  public_total?: number;
  principal_visible_total?: number;
  registry_version?: string;
  registry_revision?: string;
  schema_version?: string;
  actions_total?: number;
  /** MCP-executable catalog rows (excludes REST-only commerce hints). */
  mcp_executable_total?: number;
  /** REST-only commerce_rest catalog rows — not MCP execute steps. */
  rest_catalog_total?: number;
  domains_total?: number;
  domains?: DiscoveryStatusDomainSlice[];
  recipes_total?: number;
  catalog_etag?: string;
  generated_at?: string;
  instruction_locale?: string;
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
/** Mirror Python ``resolve_mcp_error`` for SDK consumers. */
export function parseMcpRecoveryError(
  code: string | null | undefined,
  context?: Record<string, unknown>,
): {
  code: string;
  hint?: string;
  suggested_actions: string[];
  category?: string;
} {
  const key = String(code || 'internal');
  const hints: Record<string, string> = {
    auth_required:
      'Authenticate first, then run agentstack_session_setup to bind context.project_id.',
    validation_error: 'Fix params using GET /mcp/actions input schema.',
    action_not_found: 'Use discovery.list or discovery.search for exact action names.',
    permission_denied: 'Widen RBAC or use rbac.check_permission before retry.',
    not_ready: 'Resource not yet visible — poll list/status with retry_after_ms.',
    mcp_sync_heavy_limit: 'Split batch or set options.async=true and poll discovery.job_status.',
  };
  const hint = hints[key];
  const suggested_actions = hint ? [hint] : [];
  if (context?.suggested_actions && Array.isArray(context.suggested_actions)) {
    for (const item of context.suggested_actions) {
      if (typeof item === 'string' && !suggested_actions.includes(item)) {
        suggested_actions.push(item);
      }
    }
  }
  return { code: key, hint, suggested_actions };
}

export async function fetchDiscoveryStatus(opts: {
  apiBase: string;
  token: string;
  projectId?: number;
  locale?: string;
}): Promise<DiscoveryStatusPayload> {
  const params: Record<string, string> = {};
  const locale = opts.locale?.trim();
  if (locale) params.locale = locale;

  const res = await mcpExecute(
    [{ id: 'status', action: 'discovery.status', params }],
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

/** Supported BCP-47 tags for MCP instruction-plane copy (parity with locale_tags.py). */
export type Bcp47Locale = 'en-US' | 'ru-RU' | 'pt-BR';

/** Typed params for discovery.search — pass locale for localized instruction slices. */
export type DiscoverySearchParams = {
  apiBase: string;
  token: string;
  projectId?: number;
  /** Natural-language goal or capability query. */
  q: string;
  /** Client/profile locale — forwarded to discovery.search for localized slices. */
  locale?: Bcp47Locale | string;
  limit?: number;
};

/** MCP discovery.search — ranked actions with localized instruction slices. */
export async function fetchDiscoverySearch(opts: DiscoverySearchParams): Promise<DiscoverySearchResult> {
  const params: Record<string, unknown> = { q: opts.q };
  const locale = opts.locale?.trim();
  if (locale) params.locale = locale;
  if (opts.limit != null) params.limit = opts.limit;

  const res = await mcpExecute(
    [{ id: 'search', action: 'discovery.search', params }],
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
      ? (payload as { data?: DiscoverySearchResult }).data
      : (payload as DiscoverySearchResult | undefined);
  if (!data) {
    throw new Error('discovery.search returned no data');
  }
  return data;
}
