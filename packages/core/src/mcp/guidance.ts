/**
 * MCP onboarding guidance for SDK consumers.
 * Genetic tag: repo.platform.sdk.ai_surface.gen1
 */

import { normalizeMcpToolEnvelope } from '../agents/planGraph';
import type { McpCatalogActionRow } from '../fabric/capabilityDescriptor';
import {
  mcpExecute,
  summarizeMcpBatchOutcome,
  type McpExecuteResult,
  type McpStep,
} from './execute';
import {
  mergeMcpCatalogDelta,
  type McpCatalogDeltaPayload,
} from './catalogDelta';

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
  'mcp_tenant_business_assistant_v1',
  'mcp_bots_simulate',
  'mcp_bot_reply_mailbox_v1',
  'mcp_bot_message_bus_webhook_v1',
  'mcp_bot_order_manager_bootstrap_v1',
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
  'mcp_stackscript_qa_ladder_v1',
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

/** Bare `/mcp/prompts` is not registered — use `promptsList` or `promptGet?name=`. */
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
      detail: 'completion not_evaluable ≠ passed; verification_failed → agents.plan_compaction_preview → agents.plan_heal_leaf (dry_run then apply) — spill_incomplete or plan_graph_too_large; agents.plan_recovery_scan — verification_failed candidates + stale claims; optional env_uuid; agents.plan_propose mode=repair_plan — target node_id; allow_generic_acceptance repair-only; agents.plan_apply_proposal — same env_uuid as propose on sandbox forks; agents.work_next handoff=true node_id=… — re-resolve after repair or provision; diagnostics reconcile',
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
  membership_required: "Open community hub: call projects.join on context.project_id, then agents.work_next with home=project_self (recipe mcp_community_hub_v1).",
  join_not_allowed: "Project is not open-join — request invite or projects.add_user from an owner.",
  provision_required: "ensure_agent create=false (H5) then create=true then plan_claim",
  no_compatible_agent: "agents.ensure_agent create=false (H5) then create=true, or plan_propose mode=repair_plan",
  operator_closure: "Platform ops leaf — no required_role: close with agents.plan_patch (set_meta gates_passed + gate_evidence, FSM in_progress→verifying→completed). discovery.describe agents.plan_patch for ops_compact.",
  planning_required: "agents.plan_propose mode=create_plan or decompose_node — strategic/decomposition node, not execution",
  planning_blocked: "agents.plan_propose mode=decompose_node or plan_process_backlog — finish planner plane first",
  dependency_blocked: "agents.plan_get to inspect upstream deps; do not ensure_agent; do not claim",
  checklist_gate_open: "Complete checklist gates on meta.checklist_gates (plan_node entity); agents.plan_get node_id=… — do not patch description as a blocker",
  claim_empty: "agents.work_next handoff=true — no nodes claimed; refresh claimable set",
  node_not_found: "agents.plan_get include_claimable=true — node_id absent from graph slice",
  node_not_eligible: "agents.plan_get on the same home — node failed evaluate_work_eligibility; agents.work_next handoff=true and follow recovery.next_actions",
  plan_claim_owner_conflict: "agents.work_next handoff=true — another operator holds the lease",
  role_mismatch: "work_next handoff=true node_id=… — do not retry same agent",
  specialization_mismatch: "work_next handoff=true — follow recovery.next_actions",
  capability_mismatch: "agents.ensure_agent create=false (H5) then create=true, or plan_propose mode=repair_plan",
  verification_failed: "agents.plan_recovery_scan → plan_propose mode=repair_plan",
  fully_provisionable: "ensure_agent create=false (H5) then create=true (preferred over create_from_template)",
  generation_fork_required: "auto_generation_mode on — call generation.fork (or omit env_uuid for MCP auto-fork), then retry with env_uuid from receipt on home=project",
  supersede_in_progress: "agents.plan_get then wait/retry — in-progress node cannot be superseded without options.force_supersede_in_progress (retryable)",
  unknown_skill_id: "Fix node skill_ids to ecosystem catalog (agents.skills_list); use rag.retrieval / rag.ingest_acceptance — not MCP action names; re-run plan_propose after enrich",
  missing_required_dependency: "agents.plan_propose mode=decompose_node or repair_plan — facet DAG edge missing (storage→knowledge, logic→scheduler); inspect dependencies_to_add",
  planner_duplicate_children: "agents.plan_get — semantic facet children already exist; re-propose is a no-op or use mode=replan_subtree",
  plan_revision_conflict: "agents.plan_get reload if_match_revision; retry claim/apply (retryable)",
  invalid_state_transition: "agents.plan_get node status — legal FSM only; completed↔cancelled retries are no-ops",
  plan_patch_ops_limit: "Too many ops[] in one plan_patch — split batches; plan_get between writes (max 50)",
  plan_patch_inline_body_spill: "Inline prose exceeds chunk seal — agents.graph_file_put; follow spill recovery in error data",
  wire_budget_exceeded: "Slice too large — narrow node_id, max_depth, or use detail=cards (detail=body|full past wire budget)",
  invalid_detail: "detail/projection/limit validation — see problem.field in error payload",
  text_revision_conflict: "patch_text — re-read the field from plan_get; refresh expected_text_sha256",
  ambiguous_anchor: "patch_text search_replace — longer find, set count, or graph_file_get text window",
  expired_claim: "agents.plan_reclaim_stale — lease expired; do not treat as dependency_blocked",
  wip_full: "Agent WIP cap reached — agents.plan_get then complete/release in_progress claims; retry plan_claim",
  plan_graph_load_failed: "DNA/graph slice failed to load — plan_get (compact) then retry. If patch used a long title (>256), use patch_text or shorten title; see validation_error + field=title instead of this code when preflight maps PGVE.",
  pin_inventory_full: "Goal pin inventory at active_max — unpin a slot (plan affinity) then retry agents.plan_claim",
  pin_slot_not_found: "No matching goal pin slot for skill_id and agent_id — agents.plan_get pin_slots then retry",
  claim_heartbeat_failed: "No active in_progress lease for node_id — plan_claim the node before heartbeat_only pin ops",
  session_user_required: "Personal or session-scoped home needs a signed-in operator user_id in MCP context (or principal_user_id on the tool).",
  permission_denied: "Project RBAC denied — rbac.check_permission, confirm membership, or dev-operator persona for platform substrate tools.",
  plan_graph_private: "Orchestrator graph is private — sign in (user_id in MCP context) or set orchestrator public_read; project API keys must include created_by user.",
  not_authenticated: "MCP is required. This channel has no operator session — authorize first (Connect on plugin AgentStack MCP or /agentstack-authorize). Confirm with mcp-execute.mjs auth.get_profile. Do not retry the unsigned plugin call and do not call mcp_auth.",
  relogin_required: "Session invalidated (deploy, eviction, or X-Session-Action: relogin_required) — re-authenticate: auth.get_profile or hosted remint; do not retry the same Bearer in a loop.",
  unauthorized: "Same as auth_required — OAuth Connect, Device Code, or Bearer from profile API key; then agentstack_session_setup and context.project_id.",
  auth_required: "Authenticate before work-graph spine — auth.get_profile → context.project_id → agents.work_next (not discovery.search).",
  service_caps_required_in_prod: "Project API key has no L1 service_caps — recreate with admin permissions (auto agents_autonomous_loop in prod) or user.apikeys.create preset agents_autonomous_loop / full_project; pass context.project_id=1 for ecosystem graph.",
  service_cap_denied: "Key lacks required L1 cap (often mcp_read or project_admin for plan_patch). Widen via apikeys.create (full_project) or reconnect MCP with full OAuth scope. If project role is owner/admin, MCP widens caps for execute project_id — call auth.get_profile (credential_plane) to confirm key_preview and caps; align context.project_id with the tenant before agents.plan_get / plan_patch.",
  run_not_found: "No run row for run_id in this project — verify run_id from agents.run or traces.",
  run_not_waiting_for_approval: "agents.run_get — run is not waiting_for_approval; poll status before approve_run",
  approval_hash_mismatch: "agents.run_get — approval_artifact_hash must match pending tool call on the run",
  import_pack_personal_home_unsupported: "Orchestrator import pack requires home=project; personal session graphs use export/read paths only.",
  terminal: "agents.work_next — skip terminal node; pick another leaf (completed/cancelled not claimable)",
  waiting_input: "agents.work_next — ask_user recovery; do not plan_claim until operator input arrives",
  waiting_approval: "agents.work_next — wait approval gate; agents.plan_get to inspect approval meta",
  decomposition_blocked: "agents.plan_propose mode=decompose_node — parent has open decomposition children",
  already_claimed: "agents.work_next — check in_progress lease (H11); handoff if wrong agent; plan_reclaim_stale if stale",
  not_executable: "kind note and catalog are memory, not work. Do not plan_claim them. Claim a task, step, or issue on the same home.",
  status_not_claimable: "agents.plan_get on the same home. Claim only pending or ready nodes, or an in_progress node whose lease has expired.",
  skill_mismatch: "agents.work_next handoff=true — skill_ids mismatch; follow recovery.next_actions",
  missing_capability: "agents.ensure_agent create=false (H5) then create=true, or plan_propose mode=repair_plan",
  internal_execution_error: "agents.plan_recovery_scan → plan_propose mode=repair_plan; retry after catalog refresh",
  created_agent_not_eligible: "Provision rolled back — plan_propose mode=repair_plan or pick template with matching caps (H5)",
  ensure_agent_stamp_mismatch: "Replay create=false preview; create=true must match preview_template_id + graph_revision",
  plan_claim_required: "agents.plan_claim if_match_revision — in_progress lease before agents.plan_execute",
  plan_completion_blocked: "Attach completion_predicates evidence; do not retry agents.plan_execute until allowed",
  run_failed: "agents.work_next detail=compact — inspect run traces; repair_plan or reclaim before retry",
  plan_focus_invalid: "agents.work_next detail=compact — refresh focus_node_id from packet next_action",
  orchestrator_binding_stale: "agents.reconcile_binding repair=true",
  invalid_channel: "channel must be workspace, messenger, bot, mcp, or api — retry agents.orchestrate with a supported surface",
  orchestrator_agent_missing: "projects.orchestrator.get then projects.orchestrator.patch (or owner/agents_admin auto-provision on prod); sandbox env_uuid cannot provision — bind on prod and reconcile before sandbox orchestrate",
  orchestrate_failed: "resolve_and_run failed — read data.error_code; agents.fleet_diagnostics, agents.reconcile_binding, or agents.run_get when run_uuid is present",
  invalid_parameters: "project_id and run_id required — agent_id is optional when run_id is supplied.",
  batch_semantic_anchor_conflict: "Align step NL with batch goal anchor — use one goal_text for the batch or split batches",
  conflicting_semantic_anchor: "Same as batch_semantic_anchor_conflict — per-step NL vs batch semantic_contract",
  batch_semantic_anchor_required: "Batch includes a mutating or non-plain-read step: set options.execution_intent=direct for authorized CRUD, or options.goal, focus_node_id, or plan_execute_mode for workflow. Plain reads and validate_only (e.g. script.put) may run without goal. Use preflight.check simulate_batch_actions + simulate_batch_params (or execution_intent) to preview anchor.",
  dependency_error: "Batch only — DAG: a prior step failed or was skipped; fix the first failed step_id. Standalone notifications.deliver / channels.deliver use channel_not_linked or channels.create_bind_link, not dependency_error.",
  template_not_found: "agents.templates_list — template_id missing from catalog; agents.template_preview before create=true",
  provisioning_failed: "create_from_template or bind failed — retry agents.ensure_agent create=false (H5) then create=true",
  validation_error: "Re-run agents.plan_propose; inspect validation.errors — agents.plan_get before plan_apply_proposal",
  mode_not_implemented: "Use create_plan | decompose_node | replan_subtree | repair_plan | optimize_plan — discovery.describe agents.plan_propose",
  node_already_atomic: "Complexity too low to decompose — agents.work_next or agents.plan_get for another leaf",
  replan_budget_exceeded: "Max replans per node exceeded — agents.plan_propose mode=repair_plan on parent or escalation",
  forbidden: "Project write or project_admin required — rbac.check_permission before agents.reconcile_binding repair=true",
  env_uuid_project_only: "Omit env_uuid or set home=project and retry. self and project_self are the session row and cannot take a sandbox slice.",
  graph_home_unknown: "home must be project, self, or project_self. Retry agents.plan_get or agents.plan_patch with one of those values.",
  graph_home_address_required: "Personal home needs a resolved session address. Pass home on the tool and ensure the operator session has user_id before patch.",
  plan_ops_parent_missing: "add_child parent_id is not in the graph — create the parent first or fix parent_id.",
  plan_graph_children_exceeded: "Direct children per parent are capped (32). Flat parent_id storage counts siblings under each parent_id — not total graph nodes. Split into sub-groups or use agents.plan_propose decompose_node.",
  plan_graph_too_large: "The merged graph does not fit the JSON leaf (see graph_limits.inline_write_hard_limit_bytes, typically 512 KiB). Bodies spill near chunk_spill_target_bytes (~400 KiB). For huge prose use node.prompt/detail (not only meta.description), append_storage_ref (stubs inline text), reorder_children {parent_id,child_ids}, or storage file maps in meta.storage_refs. Cards keep ~200-char stubs after spill. Read one node with plan_get detail=body and node_id. Archive completed nodes (op archive) if titles/meta still overflow. Do not retry the same blob. Leaf heal ladder: agents.plan_compaction_preview → agents.plan_heal_leaf dry_run=true → apply.",
  plan_graph_oversize: "Plan graph exceeds size budget — agents.plan_compaction_preview then agents.plan_heal_leaf (dry_run then apply); archive completed subtrees or split objectives.",
  spill_incomplete: "graph_limits.spill_incomplete — agents.plan_compaction_preview then agents.plan_heal_leaf (dry_run then apply); archive completed nodes (plan_patch op archive) if still over cap.",
  plan_graph_bytes_high: "graph_limits.advisories plan_graph_bytes_high — agents.plan_compaction_preview; archive completed nodes or graph_file_put before bulk ingest; plan_get detail=compact.",
  plan_patch_nodes_missing_from_changed: "Revision moved but new node ids are absent on plan_get — align generation_env_uuid on context and tool params; deploy compaction protect_ids (undated completed purge); run prelude bucket parents before child ingest batches.",
  run_mismatch: "run_id does not belong to the supplied agent_id — omit agent_id or fix the pair.",
  agent_not_found: "agent_id not in project fleet — use agents.team or plan_get before run_get.",
  waiting_for_approval: "Run status waiting_for_approval — agents.approve_run with approval_artifact_hash from run_detail.",
  batch_project_scope_leak: "A failed MCP batch step with params.project_id does not retarget later steps — only auth.switch_project may promote batch context.project_id. Re-bind context.project_id before mutations if a step used a probe pid.",
  workflow_batch_bind_failed: "agents.reconcile_binding repair=true — guidance bind failed; check member row / session",
  workflow_batch_context_bind_failed: "agents.reconcile_binding repair=true — batch context bind failed",
  workflow_state_key_stamp_failed: "agents.reconcile_binding repair=true — workflow_state_key stamp failed",
  workflow_inverse_sync_failed: "agents.reconcile_binding repair=true — inverse session sync failed",
  workflow_batch_receipt_failed: "Step succeeded but receipt stamp failed — agents.reconcile_binding repair=true; retry read-only agents.plan_get before mutating",
  workflow_receipt_context_missing: "Active workflow receipt missing workflow_run_id or step_id — agents.reconcile_binding repair=true; agents.work_next handoff=true detail=compact",
  workflow_receipt_unbound: "Workflow receipt not bound to session — agents.reconcile_binding repair=true",
  orchestration_step_violation: "Action outside current workflow step — follow packet next_action / inverse_resume; do not mutate graph until step advances. For ad-hoc reads (auth.get_profile) or plan writes outside the spine, rerun the batch with options.execution_mode=plain or options.execution_intent=direct on a single allowed action. For notifications.deliver inside a playbook: run preflight.check first or use packet.next_action — not a raw deliver outside the step allow-list.",
  discovery_search_recursion: "Prefer discovery.list (optional domain=) to copy exact action ids, then discovery.describe. If you use discovery.search: one concrete q= per execute, then describe — do not chain many search steps; in goal-anchored batches run search in a separate execute (batch_semantic_anchor_conflict).",
  workflow_batch_bind_skipped: "Binding skipped (read-only batch or missing workflow_run_id) — agents.work_next handoff=true if follow-up work is expected",
  work_next_enrich_failed: "agents.work_next handoff=true detail=compact",
  work_next_repeat_reconcile_failed: "agents.reconcile_binding repair=true",
  guidance_user_row_not_found: "auth.get_profile then agents.work_next handoff=true",
  orchestrator_agent_stale: "Bound agent_uuid no longer matches fleet — agents.reconcile_binding repair=true; agents.ensure_agent when the template row is missing; then agents.work_next handoff=true.",
  plan_archive_no_effect: "Archive patch matched no nodes — agents.plan_get detail=compact; confirm archive_ids / node_id scope; use agents.plan_patch with if_match_revision, not empty ops.",
  dependency_failed: "Prerequisite batch step did not succeed — fix or remove dependsOn; poll verification_action before retrying dependent step",
  graph_storage_empty: "Prod task_list leaf is empty at revision 0 with storage hash — restore via generation supply and agents.plan_patch; do not empty-overwrite revision 0.",
  idle: "Orchestrator graph has no tasks yet (revision 0) — valid idle; seed with agents.plan_propose or agents.plan_patch before claim/execute.",
  needs_seed: "Graph revision > 0 but task list is empty — propose or patch a plan; do not run plan_recovery_scan against an intentionally empty graph.",
  fleet_skipped: "Fleet was not loaded for this work_next call (compact/rank-only path) — not the same as no_compatible_agent; load fleet or use full work_next when matching agents to tasks.",
} as const

/** agents.work_next when_blocked trilingual — parity with work_graph_instruction_atoms */
export const WORK_GRAPH_WHEN_BLOCKED_LOCALES = {
  "unknown_skill_id": {
    "en-US": "Fix skill_ids — agents.skills_list, use rag.* catalog ids, re-run plan_propose",
    "ru-RU": "Исправь skill_ids — agents.skills_list, id из каталога rag.*, снова plan_propose",
    "pt-BR": "Corrija skill_ids — agents.skills_list, ids do catálogo rag.*, plan_propose de novo",
  },
  "missing_required_dependency": {
    "en-US": "Facet DAG edge missing — agents.plan_get then plan_propose decompose_node or repair_plan",
    "ru-RU": "Нет ребра DAG — agents.plan_get затем plan_propose decompose_node или repair_plan",
    "pt-BR": "Aresta DAG ausente — agents.plan_get depois plan_propose decompose_node ou repair_plan",
  },
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
  "operator_closure": {
    "en-US": "Platform ops leaf — close via agents.plan_patch (gates_passed + gate_evidence); not ensure_agent",
    "ru-RU": "Платформенная ops-задача без роли — закрыть agents.plan_patch (gates_passed + gate_evidence), не ensure_agent",
    "pt-BR": "Tarefa ops de plataforma — fechar com agents.plan_patch (gates_passed + gate_evidence), não ensure_agent",
  },
  "idle": {
    "en-US": "Empty graph at revision 0 is idle — agents.plan_propose to seed work; compact work_next skips fleet load",
    "ru-RU": "Пустой граф revision 0 — idle; agents.plan_propose для старта; compact work_next без загрузки флота",
    "pt-BR": "Grafo vazio revision 0 — idle; agents.plan_propose para iniciar; compact work_next sem carregar frota",
  },
  "needs_seed": {
    "en-US": "Revision > 0 but no tasks — agents.plan_propose or plan_patch; not graph_storage_empty corruption",
    "ru-RU": "Revision > 0 без задач — agents.plan_propose или plan_patch; это не graph_storage_empty",
    "pt-BR": "Revision > 0 sem tarefas — agents.plan_propose ou plan_patch; não é graph_storage_empty",
  },
  "graph_storage_empty": {
    "en-US": "Storage hash shows empty prod leaf — generation supply + plan_patch; never wipe revision 0",
    "ru-RU": "Пустой prod leaf по hash — generation supply + plan_patch; не затирай revision 0",
    "pt-BR": "Leaf prod vazio pelo hash — generation supply + plan_patch; não apague revision 0",
  },
  "fleet_skipped": {
    "en-US": "Fleet load skipped for this work_next request — rank-only or compact read; retry with include_execution_eligibility=true (loads fleet once) or claim=true; do not treat as no_compatible_agent until fleet is loaded.",
    "ru-RU": "Fleet не загружался для этого work_next — rank-only или compact read; повторите с include_execution_eligibility=true (один раз подгрузит fleet) или claim=true; не считайте no_compatible_agent, пока fleet не подгружен.",
    "pt-BR": "Fleet omitido neste work_next — rank-only ou leitura compact; repita com include_execution_eligibility=true (carrega fleet uma vez) ou claim=true; não trate como no_compatible_agent até carregar fleet.",
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
  "checklist_gate_open": {
    "en-US": "Finish checklist gates (meta.checklist_gates); agents.plan_get node_id=… — use link/dependencies for node blockers, not description",
    "ru-RU": "Закройте checklist gates (meta.checklist_gates); agents.plan_get node_id=… — блокеры через link/dependencies, не description",
    "pt-BR": "Conclua checklist gates (meta.checklist_gates); agents.plan_get node_id=… — bloqueios via link/dependencies, não description",
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
  "permission_denied": {
    "en-US": "RBAC denied — rbac.check_permission, membership, or dev-operator persona",
    "ru-RU": "RBAC отказ — rbac.check_permission, членство или dev-operator persona",
    "pt-BR": "RBAC negado — rbac.check_permission, membership ou persona dev-operator",
  },
  "service_caps_required_in_prod": {
    "en-US": "Project key missing L1 service_caps — apikeys.create with agents_autonomous_loop on pid=1",
    "ru-RU": "У project key нет service_caps — apikeys.create с agents_autonomous_loop на pid=1",
    "pt-BR": "Chave sem service_caps — apikeys.create com agents_autonomous_loop em pid=1",
  },
  "service_cap_denied": {
    "en-US": "Widen caps (apikeys.create full_project) or OAuth reconnect; owner/admin gets L1 widen on execute project_id — auth.get_profile credential_plane",
    "ru-RU": "Расширьте caps (apikeys.create full_project) или переподключите OAuth; owner/admin получает widen на execute project_id — auth.get_profile credential_plane",
    "pt-BR": "Amplie caps (apikeys.create full_project) ou reconecte OAuth; owner/admin recebe widen no execute project_id — auth.get_profile credential_plane",
  },
  "plan_graph_load_failed": {
    "en-US": "Graph load failed — agents.plan_get (compact) then retry. Long titles: max 256 chars (field=title); use patch_text for prose.",
    "ru-RU": "Не загрузился граф — agents.plan_get (compact), затем patch. title ≤256; длинный текст — patch_text.",
    "pt-BR": "Falha ao carregar grafo — agents.plan_get (compact) e retry. title ≤256; texto longo — patch_text.",
  },
  "pin_inventory_full": {
    "en-US": "Pin inventory full — unpin a goal slot, then retry agents.plan_claim",
    "ru-RU": "Инвентарь pin заполнен — освободите слот, затем agents.plan_claim",
    "pt-BR": "Inventário de pin cheio — desafixe um slot, depois agents.plan_claim",
  },
  "pin_slot_not_found": {
    "en-US": "Pin slot not found — check skill_id and agent_id on the goal inventory",
    "ru-RU": "Слот pin не найден — проверьте skill_id и agent_id в инвентаре цели",
    "pt-BR": "Slot pin não encontrado — confira skill_id e agent_id no inventário da meta",
  },
  "claim_heartbeat_failed": {
    "en-US": "Claim lease missing — plan_claim the node before heartbeat_only pin writes",
    "ru-RU": "Нет lease — сначала plan_claim узла, затем heartbeat_only для pin",
    "pt-BR": "Sem lease — faça plan_claim do nó antes de pin com heartbeat_only",
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
  "plan_claim_required": {
    "en-US": "Claim lease first — agents.plan_claim with if_match_revision, then agents.plan_execute",
    "ru-RU": "Сначала lease — agents.plan_claim с if_match_revision, затем agents.plan_execute",
    "pt-BR": "Lease primeiro — agents.plan_claim com if_match_revision, depois agents.plan_execute",
  },
  "plan_completion_blocked": {
    "en-US": "Completion blocked — attach completion_predicates evidence; do not retry plan_execute",
    "ru-RU": "Завершение заблокировано — приложите completion_predicates; не повторяйте plan_execute",
    "pt-BR": "Conclusão bloqueada — anexe completion_predicates; não repita plan_execute",
  },
  "run_failed": {
    "en-US": "Run failed — agents.work_next then traces or plan_recovery_scan before retry",
    "ru-RU": "Run failed — agents.work_next, затем traces или plan_recovery_scan перед retry",
    "pt-BR": "Run failed — agents.work_next, depois traces ou plan_recovery_scan antes de retry",
  },
  "invalid_parameters": {
    "en-US": "project_id and run_id required — agent_id optional when run_id is set",
    "ru-RU": "Нужны project_id и run_id — agent_id опционален при run_id",
    "pt-BR": "project_id e run_id obrigatórios — agent_id opcional com run_id",
  },
  "run_not_found": {
    "en-US": "No run for run_id — verify from agents.run or traces",
    "ru-RU": "Нет run для run_id — проверьте agents.run или traces",
    "pt-BR": "Sem run para run_id — verifique agents.run ou traces",
  },
  "run_mismatch": {
    "en-US": "run_id does not match agent_id — omit agent_id or fix the pair",
    "ru-RU": "run_id не совпадает с agent_id — уберите agent_id или исправьте пару",
    "pt-BR": "run_id não combina com agent_id — omita agent_id ou corrija o par",
  },
  "agent_not_found": {
    "en-US": "agent_id not in fleet — agents.team or plan_get first",
    "ru-RU": "agent_id нет во флоте — сначала agents.team или plan_get",
    "pt-BR": "agent_id fora da frota — agents.team ou plan_get antes",
  },
  "waiting_for_approval": {
    "en-US": "Run waiting_for_approval — agents.approve_run with approval_artifact_hash",
    "ru-RU": "Run waiting_for_approval — agents.approve_run с approval_artifact_hash",
    "pt-BR": "Run waiting_for_approval — agents.approve_run com approval_artifact_hash",
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
      label: 'Schema lookup — max one discovery.search per execute; use q=',
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

export type { McpCatalogDeltaPayload };
export { mergeMcpCatalogDelta };

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

/** discovery.describe default payload for agents.plan_patch (wire SoT). */
export type PlanPatchOpsCompact = {
  canonical: string[];
  aliases: Record<string, string>;
  shapes?: Record<string, Record<string, unknown>>;
  preflight_read?: {
    action: string;
    params: Record<string, unknown>;
    rule?: string;
  };
  archive_ids_only?: {
    archive_ids: string[];
    if_match_revision: number;
    rule?: string;
  };
  limits?: Record<string, number | string>;
};

export function pickCanonicalPlanPatchOp(op: string, compact: PlanPatchOpsCompact): string {
  const key = String(op || '').trim().toLowerCase();
  return compact.aliases[key] ?? key;
}

/** discovery.describe default payload for agents.plan_get (hot-loop slice SoT). */
export type PlanGetSliceCompact = {
  hot_loop: {
    home: string;
    detail: string;
    limit: number;
    max_depth: number;
  };
  single_node_loop?: {
    home: string;
    detail: string;
    limit: number;
    max_depth: number;
    node_id: string;
  };
  detail_allowed?: string[];
  detail_aliases?: Record<string, string>;
  heavy_optional_flags?: string[];
  node_scoped_hint?: string;
};

/** discovery.describe default payload for agents.work_next (closed-loop SoT). */
export type WorkNextLoopCompact = {
  hot_loop: { detail: string; home: string };
  recipe_id: string;
  spine?: string[];
  rule?: string;
  heavy_expand?: string[];
};

export type PlanClaimCasCompact = {
  hot_loop: Record<string, unknown>;
  cas_required: boolean;
  aliases?: Record<string, string>;
  rule?: string;
};

export type PlanProposeModesCompact = {
  hot_loop: Record<string, unknown>;
  modes?: string[];
  rule?: string;
};

export type PlanApplyProposalCompact = {
  hot_loop: Record<string, unknown>;
  cas_required: boolean;
  rule?: string;
};

export type PlanRecoveryScanCompact = {
  hot_loop: Record<string, unknown>;
  read_only: boolean;
  typical_follow?: string;
};

/** discovery.describe optional panel for script.put (wire SoT). */
export type ScriptPutLimitsCompact = {
  max_bytes_per_put: number;
  max_line_bytes: number;
  max_lines_per_file: number;
  compile_timeout_s_default: number;
  compile_isolation: 'thread' | 'process';
  compile_process_workers?: number;
};

/** Slim discovery.describe payload (optional *_compact panels). */
/** discovery.describe panel for agents.graph_file_put (storage ↔ plan node). */
export type GraphFilePutCompact = {
  hot_loop: Record<string, unknown>;
  cas_required?: boolean;
  read_back?: string[];
  verify?: string;
  plan_get_visibility?: string;
  not_chunk_spill?: string;
  rule?: string;
};

/** discovery.describe panel for agents.graph_file_get (read linked bytes). */
export type GraphFileGetCompact = {
  hot_loop: Record<string, unknown>;
  list_refs?: string;
  rule?: string;
};

export type DiscoveryDescribeDefaultData = {
  action: string;
  params_compact?: Array<{
    name: string;
    type: string;
    req: boolean;
    enum?: unknown[];
    req_if?: string;
  }>;
  example_request?: { action: string; params: Record<string, unknown> };
  slice_compact?: PlanGetSliceCompact;
  loop_compact?: WorkNextLoopCompact;
  ops_compact?: PlanPatchOpsCompact;
  claim_compact?: PlanClaimCasCompact;
  propose_compact?: PlanProposeModesCompact;
  apply_compact?: PlanApplyProposalCompact;
  recovery_compact?: PlanRecoveryScanCompact;
  limits_compact?: ScriptPutLimitsCompact;
  graph_file_compact?: GraphFilePutCompact | GraphFileGetCompact;
  effect?: Record<string, unknown>;
  capability_descriptor_slim?: Record<string, unknown>;
};

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

export async function fetchMcpActionsSummary(
  apiBase: string,
  opts?: { locale?: string },
): Promise<McpActionsSummary> {
  const origin = resolveMcpGuidanceUrl(apiBase, MCP_GUIDANCE_URLS.actionsSummary);
  const locale = String(opts?.locale ?? '').trim();
  const url = new URL(origin);
  if (locale) url.searchParams.set('locale', locale);
  const headers: Record<string, string> = {};
  if (locale) headers['Accept-Language'] = locale;
  const res = await fetch(url.toString(), { headers });
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
export async function getMcpCatalogFacts(
  apiBase: string,
  opts?: { locale?: string },
): Promise<McpCatalogFacts> {
  const summary = await fetchMcpActionsSummary(apiBase, opts);
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
  /** BCP-47 — query + Accept-Language for served catalog projection. */
  locale?: string;
}

/** GET /mcp/actions — enriched MCP catalog (includes capability_descriptor slim rows). */
export async function mcpListActions(opts: McpListActionsOptions): Promise<unknown> {
  let url = buildMcpCatalogActionsUrl(opts.apiBase, {
    hot: opts.hot ?? false,
    sinceEtag: opts.sinceEtag ?? null,
    delta: opts.delta ?? false,
  });
  const locale = String(opts.locale ?? '').trim();
  if (locale) {
    const parsed = new URL(url);
    parsed.searchParams.set('locale', locale);
    url = parsed.toString();
  }
  const listHeaders: Record<string, string> = {
    Authorization: `Bearer ${opts.token}`,
  };
  if (locale) {
    listHeaders['Accept-Language'] = locale;
  }
  const res = await fetch(url, {
    headers: listHeaders,
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
  /** BCP-47 — forwarded as Accept-Language for instruction-plane copy. */
  locale?: string;
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
  const locale = String(opts.locale ?? '').trim();
  const preflightHeaders: Record<string, string> = {
    Authorization: `Bearer ${opts.token}`,
    Accept: 'application/json',
  };
  if (locale) {
    preflightHeaders['Accept-Language'] = locale;
  }
  const res = await fetch(url.toString(), {
    headers: preflightHeaders,
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
      locale: locale || undefined,
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

export type WorkflowDiagnostic = {
  code?: string;
  severity?: 'warning' | 'error' | string;
  reason?: string;
  action?: string;
};

/** Parse workflow warnings from execute / batch envelope (not top-level error_code). */
export function workflowDiagnosticsFromEnvelope(
  payload: Record<string, unknown> | null | undefined,
): WorkflowDiagnostic[] {
  if (!payload || typeof payload !== 'object') return [];
  const top = payload.workflow_diagnostics;
  if (Array.isArray(top)) {
    return top.filter((row): row is WorkflowDiagnostic => Boolean(row) && typeof row === 'object');
  }
  const wc = payload.workflow_completion;
  if (wc && typeof wc === 'object') {
    const nested = (wc as Record<string, unknown>).workflow_diagnostics;
    if (Array.isArray(nested)) {
      return nested.filter(
        (row): row is WorkflowDiagnostic => Boolean(row) && typeof row === 'object',
      );
    }
  }
  return [];
}

export const MCP_CERTIFICATION_RECIPE_ID = 'mcp_agent_certification_v1';

export const MCP_TENANT_BUSINESS_ASSISTANT_RECIPE_ID = 'mcp_tenant_business_assistant_v1';

/** Run any MCP platform recipe from Compass / tooling (`core.mcp.self_description.gen1`). */
export type McpPlaybookRecipeResult = {
  execute: McpExecuteResult;
  receipt?: FlowReceipt;
  outcome?: ReturnType<typeof summarizeMcpBatchOutcome>;
};

export async function runMcpPlaybookRecipe(opts: {
  apiBase: string;
  token: string;
  projectId: number;
  recipeId: string;
  idempotencyKey?: string;
  recipeParams?: Record<string, unknown>;
  locale?: string;
  async?: boolean;
  timeoutMs?: number;
  preflight?: boolean;
}): Promise<McpPlaybookRecipeResult> {
  if (opts.preflight) {
    await runMcpPreflight({
      apiBase: opts.apiBase,
      token: opts.token,
      projectId: opts.projectId,
      locale: opts.locale,
    });
  }
  const execute = await mcpExecute([], {
    token: opts.token,
    projectId: opts.projectId,
    mcpUrl: resolveMcpGuidanceUrl(opts.apiBase, MCP_GUIDANCE_URLS.mcp),
    recipeId: opts.recipeId,
    recipeParams: opts.recipeParams,
    idempotencyKey: opts.idempotencyKey,
    stopOnError: false,
    locale: opts.locale,
    async: opts.async ?? opts.recipeId === MCP_TENANT_BUSINESS_ASSISTANT_RECIPE_ID,
    timeoutMs: opts.timeoutMs,
  });
  const outcome = summarizeMcpBatchOutcome(execute);
  const receipt =
    opts.recipeId === MCP_TENANT_BUSINESS_ASSISTANT_RECIPE_ID
      ? buildTenantBusinessAssistantReceipt(execute, opts.projectId)
      : undefined;
  return { execute, outcome, receipt };
}

export function buildTenantBusinessAssistantReceipt(
  execute: McpExecuteResult,
  projectId: number,
): FlowReceipt {
  const raw =
    execute.raw && typeof execute.raw === 'object'
      ? (execute.raw as Record<string, unknown>)
      : {};
  const inner = (raw.result as Record<string, unknown> | undefined) ?? raw;
  const steps = Array.isArray(inner.steps) ? inner.steps : [];
  let headProjectId = projectId;
  for (const row of steps) {
    if (!row || typeof row !== 'object') continue;
    const res = (row as Record<string, unknown>).result as Record<string, unknown> | undefined;
    const hid = res?.head_project_id ?? res?.headProjectId;
    if (hid != null) {
      headProjectId = Number(hid);
      break;
    }
  }
  return buildFlowReceipt({
    flow_id: MCP_TENANT_BUSINESS_ASSISTANT_RECIPE_ID,
    project_id: headProjectId,
    partial_success: Boolean(execute.partial_success),
    succeeded_count: execute.succeeded_count,
    failed_step_ids: execute.failed_step_ids ?? [],
    trace_ids: execute.trace_ids ?? [],
    final_state: execute.ok ? 'completed' : execute.partial_success ? 'blocked' : 'aborted',
  });
}

/** Run tenant business assistant MCP recipe (UF_TENANT_BUSINESS_ASSISTANT executable SoT). */
export async function runMcpTenantBusinessAssistantRecipe(opts: {
  apiBase: string;
  token: string;
  projectId: number;
  idempotencyKey?: string;
  recipeParams?: Record<string, unknown>;
  locale?: string;
}): Promise<McpPlaybookRecipeResult> {
  return runMcpPlaybookRecipe({
    ...opts,
    recipeId: MCP_TENANT_BUSINESS_ASSISTANT_RECIPE_ID,
  });
}

/** Run full agent certification recipe and return FlowReceipt + execute result. */
export async function runMcpCertificationRecipe(opts: {
  apiBase: string;
  token: string;
  projectId: number;
  idempotencyKey?: string;
  locale?: string;
}): Promise<{ receipt: FlowReceipt; execute: McpExecuteResult }> {
  const res = await mcpExecute([], {
    token: opts.token,
    projectId: opts.projectId,
    mcpUrl: resolveMcpGuidanceUrl(opts.apiBase, MCP_GUIDANCE_URLS.mcp),
    recipeId: MCP_CERTIFICATION_RECIPE_ID,
    idempotencyKey: opts.idempotencyKey,
    stopOnError: false,
    locale: opts.locale,
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
    action_not_found:
      'Use discovery.list to copy exact action ids, then discovery.describe(params.action). Avoid discovery.search inside goal-anchored batches (batch_semantic_anchor_conflict).',
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
      projectId: opts.projectId,
      mcpUrl: resolveMcpGuidanceUrl(opts.apiBase, MCP_GUIDANCE_URLS.mcp),
      stopOnError: true,
      locale,
    },
  );
  const first = res.results[0];
  const { data: envelopeData } = normalizeMcpToolEnvelope(first?.result ?? first);
  const data = (envelopeData as DiscoveryStatusPayload) || undefined;
  if (!data || typeof data !== 'object') {
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
      projectId: opts.projectId,
      mcpUrl: resolveMcpGuidanceUrl(opts.apiBase, MCP_GUIDANCE_URLS.mcp),
      stopOnError: true,
      locale,
    },
  );
  const first = res.results[0];
  const { data: envelopeData } = normalizeMcpToolEnvelope(first?.result ?? first);
  const data = envelopeData as DiscoverySearchResult;
  if (!data || typeof data !== 'object') {
    throw new Error('discovery.search returned no data');
  }
  return data;
}

/** Unity ops post-deploy report — priemka_coverage block (repo.ops.prod_test_atlas.gen1). */
export type UnityPriemkaCoverageSummary = {
  pass: number;
  partial: number;
  fail: number;
  manual: number;
  skip: number;
  total_items: number;
};

/**
 * Extract priemka checklist automation matrix from unity_post_deploy_verify JSON.
 * `report.ok` can be false on coverage fail while manual items still dominate — do not conflate.
 */
export type UnityOpsAutomationGate = {
  opsOk: boolean;
  automationOk: boolean;
  signoffOk: boolean;
};

/** Split report.ok into ops steps vs priemka automation vs manual sign-off (E18-01). */
export function unityOpsAutomationGate(
  report: Record<string, unknown> | null | undefined,
): UnityOpsAutomationGate {
  const gates = report?.gates;
  if (gates && typeof gates === 'object') {
    const g = gates as Record<string, unknown>;
    return {
      opsOk: Boolean(g.ops_steps_ok),
      automationOk: Boolean(g.priemka_automation_ok),
      signoffOk: Boolean(g.priemka_signoff_ok),
    };
  }
  const cov = unityPriemkaCoverageFromOpsReport(report);
  const opsOk = report?.ok !== false;
  return {
    opsOk,
    automationOk: cov ? cov.fail === 0 && cov.skip === 0 : opsOk,
    signoffOk: cov ? cov.manual === 0 : false,
  };
}

export function unityPriemkaCoverageFromOpsReport(
  report: Record<string, unknown> | null | undefined,
): UnityPriemkaCoverageSummary | null {
  const raw = report?.priemka_coverage;
  if (!raw || typeof raw !== 'object') return null;
  const cov = raw as Record<string, unknown>;
  const total = Number(cov.total_items);
  if (!Number.isFinite(total) || total <= 0) return null;
  return {
    pass: Number(cov.pass) || 0,
    partial: Number(cov.partial) || 0,
    fail: Number(cov.fail) || 0,
    manual: Number(cov.manual) || 0,
    skip: Number(cov.skip) || 0,
    total_items: total,
  };
}
