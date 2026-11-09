/** Headless plan / Work Graph types (mirrors shared/atoms/agent_task_list.py). */

import { isPlanArchiveNoEffect, isPlanRevisionConflict } from './planGraphErrors';

export type PatchDelta = {
  id: string;
  status?: string;
  revision?: number;
  fields_changed?: string[];
};

export type WipFullError = {
  code: 'wip_full';
  blocking_leases?: Array<{
    node_id: string;
    title?: string;
    agent_id?: string | null;
    lease_expired?: boolean;
  }>;
  next_action?: { action: string; params?: Record<string, unknown> };
};

const PLAN_GET_HYDRATE_DETAILS = new Set(['body', 'full']);

export type PlanPatchPreflightReadWire = {
  action?: string;
  params?: Record<string, unknown>;
  rule?: string;
};

/** Optional plan_get step from plan_patch PGVE envelope (parity with ops_compact.preflight_read). */
export function planPatchPreflightReadStep(
  envelope: Record<string, unknown> | null | undefined,
  stepId = 'preflight_plan_get',
): { id: string; action: string; params: Record<string, unknown> } | null {
  if (!envelope || typeof envelope !== 'object') return null;
  const pre = envelope.preflight_read as PlanPatchPreflightReadWire | undefined;
  if (!pre || typeof pre !== 'object') return null;
  const action = String(pre.action ?? '').trim();
  const params = pre.params;
  if (!action || !params || typeof params !== 'object' || Array.isArray(params)) return null;
  return { id: stepId, action, params: clampPlanGetDispatchDetail({ ...params }) };
}

function planGetParamsEqual(
  a: Record<string, unknown> | undefined,
  b: Record<string, unknown> | undefined,
): boolean {
  if (!a || !b) return false;
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return false;
  }
}

/** Suggested plan_get pre-step when PGVE envelope carries preflight_read (WG-3). */
export function workGraphPreflightStepsFromBody(
  data: Record<string, unknown> | null | undefined,
): Array<{ id: string; action: string; params: Record<string, unknown> }> {
  const step = planPatchPreflightReadStep(data);
  if (!step) return [];
  const na = recoveryNextActionFromBody(data ?? {});
  const naAction = String(na?.action ?? '').trim();
  if (naAction === 'agents.plan_get' && planGetParamsEqual(na?.params as Record<string, unknown>, step.params)) {
    return [];
  }
  return [step];
}

/** Read preflight_step from a blocked work_next / PGVE packet (WG-5). */
export function workGraphPreflightStepFromPacket(
  packet?: WorkNextPacket | null,
): { id: string; action: string; params: Record<string, unknown> } | null {
  const diag = packet?.diagnostics as Record<string, unknown> | undefined;
  const rec = diag?.plan_patch_recovery as Record<string, unknown> | undefined;
  if (!rec || typeof rec !== 'object') return null;
  const raw = rec.preflight_step;
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const action = String((raw as { action?: string }).action ?? '').trim();
    const params = (raw as { params?: Record<string, unknown> }).params;
    if (action && params && typeof params === 'object' && !Array.isArray(params)) {
      return {
        id: String((raw as { id?: string }).id ?? 'preflight_plan_get'),
        action,
        params: clampPlanGetDispatchDetail({ ...params }),
      };
    }
  }
  const fromRead = planPatchPreflightReadStep({
    preflight_read: rec.preflight_read,
  } as Record<string, unknown>);
  return fromRead;
}

/** Drop consumed preflight hints so runWorkGraphLoop does not repeat plan_get (WG-6). */
export function clearWorkGraphPreflightFromPacket(packet: WorkNextPacket): WorkNextPacket {
  const diag = packet.diagnostics as Record<string, unknown> | undefined;
  const rawRec = diag?.plan_patch_recovery;
  if (!rawRec || typeof rawRec !== 'object' || Array.isArray(rawRec)) {
    return packet;
  }
  const rec = { ...(rawRec as Record<string, unknown>) };
  delete rec.preflight_step;
  delete rec.preflight_read;
  const nextDiag: Record<string, unknown> = { ...(diag ?? {}) };
  if (Object.keys(rec).length > 0) {
    nextDiag.plan_patch_recovery = rec;
  } else {
    delete nextDiag.plan_patch_recovery;
  }
  return {
    ...packet,
    diagnostics: parseWorkNextDiagnostics(nextDiag),
  };
}

/** Automated dispatch only — not AgentsFleet.planGet (sdk.agents.plan_graph.gen1). */
export function clampPlanGetDispatchDetail(
  params: Record<string, unknown>,
): Record<string, unknown> {
  const detail = String(params.detail ?? '').trim().toLowerCase();
  if (!PLAN_GET_HYDRATE_DETAILS.has(detail)) return params;
  const nodeScoped = Boolean(String(params.node_id ?? params.root_id ?? '').trim());
  const allowHeavy =
    params.allow_plan_get_hydrate === true || params.plan_get_hydrate === true;
  if (nodeScoped || allowHeavy) return params;
  const { allow_plan_get_hydrate: _a, plan_get_hydrate: _b, ...rest } = params;
  return { ...rest, detail: 'cards' };
}

export function parseWorkNextNextAction(
  packet: Record<string, unknown> | null | undefined,
): { action: string; params: Record<string, unknown> } | null {
  const row = packet?.next_action;
  if (!row || typeof row !== 'object') return null;
  const action = String((row as { action?: string }).action || '').trim();
  if (!action) return null;
  const params = (row as { params?: Record<string, unknown> }).params;
  return { action, params: params && typeof params === 'object' ? { ...params } : {} };
}

import {
  batchEnvelopeHasWorkGraphBlock,
  mergeExecuteEnvelopeIntoPacket,
  type WorkflowDiagnostic,
  type WorkflowCompletion,
} from '../mcp/execute';
import {
  MCP_WORK_GRAPH_HOIST_KEYS,
  normalizeMcpWorkGraphPayload,
} from '../mcp/workGraphHoist';
import { goalVerificationFromEnvelope } from '../mcp/goalVerificationWire';
import type { GoalVerificationWire } from '../mcp/goalVerificationWire';

export type PlanNodeKind =
  | 'objective'
  | 'key_result'
  | 'initiative'
  | 'workstream'
  | 'issue'
  | 'feature'
  | 'task'
  | 'step'
  | 'verification'
  | 'goal'
  | 'note'
  | 'catalog';

export type PlanNodeLayer = 'business' | 'strategic' | 'tactical' | 'execution' | 'unknown';

export type NodeScope = 'project' | 'agent' | 'personal';

export type PriorityClass = 'P0' | 'P1' | 'P2' | 'P3' | 'P4' | 'P5';

/** Semantic ECS components stamped on plan node meta (0.4.22+). */
export type PlanNodeSkillBinding = {
  skill_id: string;
  required?: boolean;
  source?: string;
  scope?: string;
  confidence?: number;
  reason?: string;
};

/**
 * Instruction packet skill chip row — parity with SPA `skillChipRowsFromPacket`
 * (`frontend.project.copilot.gen1` / `instructionPacketUi.ts`).
 */
export type InstructionPacketSkillChipRow = {
  id: string;
  required?: boolean;
};

/** @deprecated Use InstructionPacketSkillChipRow — alias for copilot parity naming. */
export type SkillChipRow = InstructionPacketSkillChipRow;

export type PlanNodeSemanticMeta = {
  facet_id?: string;
  task_type?: string;
  skill_bindings?: PlanNodeSkillBinding[];
  semantic_context?: Record<string, unknown>;
  allowed_action_classes?: string[];
  forbidden_action_classes?: string[];
};

export type PlanNode = {
  id: string;
  kind?: PlanNodeKind;
  title?: string;
  prompt?: string;
  objective?: string;
  status?: string;
  priority?: number;
  priority_class?: PriorityClass;
  priority_score?: number | null;
  parent_id?: string | null;
  layer?: PlanNodeLayer;
  complexity?: number | null;
  impact?: number | null;
  urgency?: number | null;
  effort?: number | null;
  severity?: number | null;
  risk?: number | null;
  goal_id?: string | null;
  agent_id?: string | null;
  required_role?: string | null;
  skill_ids?: string[];
  dependencies?: string[];
  /** Read projection. Inverse of dependencies. Not stored. */
  blocks?: string[];
  /** Soft links to other homes. Not dependency edges. */
  refs?: Array<{ project_id: number; user_id?: number; node_id: string }>;
  acceptance_criteria?: string[];
  completion_predicates?: string[];
  evidence?: string[] | Record<string, unknown>;
  root_run_id?: string | null;
  playbook_step_id?: string | null;
  intent_id?: string | null;
  allowed_actions?: string[];
  forbidden_actions?: string[];
  decomposition_status?: string;
  planning_state?: string;
  parallelizable?: boolean | null;
  scope?: NodeScope | string;
  detail?: string;
  quality_profiles?: string[];
  source?: Record<string, unknown> | null;
  report_to?: Record<string, unknown> | null;
  /** Lease keys live under meta: claimed_at, lease_until, heartbeat_at, last_claim. */
  meta?: Record<string, unknown>;
  /** Spill envelope — body lives in ecosystem storage when set. */
  chunk_id?: string;
  body_sha?: string;
  children?: PlanNode[];
};

export type PlanColdPageRef = {
  page_id?: string;
  file_id?: string;
  parent_id?: string;
  node_ids?: string[];
  rollup?: Record<string, number>;
  sealed_at?: string;
};

export type PlanGraph = {
  version?: number;
  revision?: number;
  root_prompt?: string;
  active_goal_id?: string | null;
  /** Hot-leaf refs to sealed completed subtrees (page blobs). */
  cold_pages?: PlanColdPageRef[];
  tasks?: PlanNode[];
};

/** MCP ``agents.plan_patch`` default envelope (revision + changed[]). */
export type PlanPatchCard = Partial<PlanNode> & { id: string };

export type PlanPatchArchivedCard = { id: string; status?: string };

export type PlanPatchResult = {
  ok?: boolean;
  revision: number;
  content_hash?: string;
  changed?: PlanPatchCard[];
  archived?: PlanPatchArchivedCard[];
  semantic_noop?: boolean;
  warnings?: Record<string, unknown>;
  graph_metrics?: Record<string, unknown>;
  previous_revision?: number;
  new_revision?: number;
};

export type PlanPatchTextOp = {
  op: 'patch_text';
  id: string;
  field?: string;
  mode?:
    | 'search_replace'
    | 'fuzzy_replace'
    | 'append'
    | 'prepend'
    | 'replace'
    | 'insert_before'
    | 'insert_after';
  replacements?: Array<{ find?: string; replace?: string; search?: string; count?: number }>;
  content?: string;
  fuzzy?: boolean;
  expected_text_sha256?: string;
  domain?: 'node' | 'children' | 'neighborhood';
  focus_id?: string;
};

export type PlanAppendStorageRefOp = {
  op: 'append_storage_ref';
  id: string;
  ref: Record<string, unknown>;
};

export type PlanGraphFilePutBody = {
  node_id: string;
  filename: string;
  content?: string;
  content_base64?: string;
  folder?: string;
  scope?: 'user' | 'project';
  if_match_revision: number;
  home?: 'project' | 'self' | 'project_self';
  env_uuid?: string;
};

/** REST ``POST …/orchestrator/plan/ops`` (Wave 4) — same delta envelope as MCP ops. */
export type PlanOpsRequestBody = {
  ops?: Array<Record<string, unknown> | PlanPatchTextOp | PlanAppendStorageRefOp>;
  if_match_revision?: number;
  home?: 'project' | 'self' | 'project_self';
  env_uuid?: string;
  archive_ids?: string[];
};

export type PlanOpsResponse = PlanPatchResult & {
  success?: boolean;
};

/** Planner proposal DTO — mirrors shared/work_graph/planner_proposal.py */
export type PlannerMode =
  | 'create_plan'
  | 'decompose_node'
  | 'replan_subtree'
  | 'repair_plan'
  | 'optimize_plan';

export type PlannerProposal = {
  proposal_id: string;
  base_graph_revision: number;
  goal_id?: string;
  mode?: PlannerMode;
  created_by?: string;
  nodes_to_create?: Array<Record<string, unknown>>;
  nodes_to_update?: Array<Record<string, unknown>>;
  nodes_to_supersede?: string[];
  supersede_reason?: string;
  preserve_completed?: boolean;
  dependencies_to_add?: Array<[string, string]>;
  dependencies_to_remove?: Array<[string, string]>;
  assumptions?: Array<Record<string, unknown>>;
  risks?: Array<Record<string, unknown>>;
  quality_checks?: string[];
};

export type PlannerValidationDimensions = {
  structural?: { ok?: boolean; errors?: string[] };
  semantic?: { ok?: boolean; errors?: string[] };
  execution?: {
    executable_now?: boolean;
    executable_after_provision?: boolean;
    provisionable?: boolean;
    fully_provisionable?: boolean;
    partially_provisionable?: boolean;
    execution_summary?: ExecutionSummary;
    /** @deprecated Prefer execution_summary.missing_requirements */
    missing_roles?: string[];
    missing_requirements?: WorkNextExecution['missing_requirements'];
    provisionable_templates?: string[];
    compatible_templates?: WorkNextExecution['compatible_templates'];
  };
  plan_valid?: boolean;
  safe_to_apply?: boolean;
  safe_to_execute?: boolean;
  executable_now?: boolean;
  validation_mode?: string;
};

export type PlannerSemanticCoverage = {
  ok?: boolean;
  findings?: string[];
  reports?: Array<Record<string, unknown>>;
};

export type PlannerValidation = {
  ok: boolean;
  errors?: string[];
  warnings?: string[];
  repair_hints?: string[];
  /** Wire payload from validation_result_to_payload (Python). */
  semantic_coverage?: PlannerSemanticCoverage;
  execution?: Record<string, unknown>;
  /** Full dimension split from plan_validator (plan_propose / backlog). */
  dimensions?: PlannerValidationDimensions;
  plan_valid?: boolean;
  safe_to_apply?: boolean;
  safe_to_execute?: boolean;
  executable_now?: boolean;
  validation_mode?: string;
};

/** REST / MCP plan_propose body — threads discovery route when available. */
export type PlanProposeRequestBody = {
  mode?: string;
  node_id?: string;
  goal_text?: string;
  max_children?: number;
  use_llm?: boolean;
  draft_tree?: Record<string, unknown>;
  env_uuid?: string;
  validation_mode?: 'strict' | 'persist_unexecutable';
  allow_generic_acceptance?: boolean;
  locale?: string;
  routed_goal?: Record<string, unknown>;
  semantic_contract?: Record<string, unknown>;
  home?: 'project' | 'self' | 'project_self' | string;
};

export type PlanProposeResult = {
  success: boolean;
  proposal?: PlannerProposal;
  validation?: PlannerValidation;
  meta?: Record<string, unknown>;
  error_code?: string;
};

export type PlanApplyProposalResult = {
  success: boolean;
  applied?: boolean;
  task_list?: Record<string, unknown>;
  new_revision?: number;
  idempotent_replay?: boolean;
  error_code?: string;
};

/** Claim eligibility SoT (mirrors evaluate_work_eligibility). */
export type PlanEligibilityVerdict = {
  eligible: boolean;
  reasons: string[];
  blocked_by: string[];
  dependency_ready?: boolean;
  execution_ready?: boolean;
  blocked_reason?: string | null;
  resolution?: string;
};

export type PlanClaimableRow = {
  id: string;
  title: string;
  suggested_agent_id?: string;
  /** Ecosystem template agent_id when fleet resolution is template_available. */
  template_available?: string;
  priority_class?: PriorityClass | string;
  /** Scheduler explain string from claim preview (`scheduler_score`). */
  why_now?: string;
  eligibility?: PlanEligibilityVerdict;
};

export type PlanBlockedSampleRow = {
  id: string;
  title: string;
  reasons: string[];
  blocked_by: string[];
};

/** rv-24: nodes holding WIP slots when ``wip_full`` (plan_claim / work_next.claim). */
export type PlanInProgressHolderRow = {
  node_id: string;
  title: string;
  agent_id?: string | null;
  lease_expired?: boolean;
};

function parseInProgressHolders(raw: unknown): PlanInProgressHolderRow[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const rows = raw
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const r = item as Record<string, unknown>;
      const node_id = typeof r.node_id === 'string' ? r.node_id.trim() : '';
      if (!node_id) return null;
      const title =
        typeof r.title === 'string' && r.title.trim() ? r.title.trim() : node_id;
      return {
        node_id,
        title,
        ...(typeof r.agent_id === 'string' && r.agent_id.trim()
          ? { agent_id: r.agent_id.trim() }
          : {}),
        ...(typeof r.lease_expired === 'boolean' ? { lease_expired: r.lease_expired } : {}),
      } as PlanInProgressHolderRow;
    })
    .filter((x): x is PlanInProgressHolderRow => x != null);
  return rows.length ? rows : undefined;
}

/** Enriched claim preview from plan_get / orchestrator (UI + MCP). */
export type PlanClaimPreview = {
  max_wip: number;
  wip_room: number;
  wip_full: boolean;
  in_progress_project: number;
  claimable: PlanClaimableRow[];
  claimable_count: number;
  blocked_sample?: PlanBlockedSampleRow[];
  in_progress_holders?: PlanInProgressHolderRow[];
  active_goal_id?: string | null;
};

export function parsePlanClaimPreview(raw: unknown): PlanClaimPreview | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const row = raw as Record<string, unknown>;
  const claimable = Array.isArray(row.claimable)
    ? row.claimable
        .map((item) => {
          if (!item || typeof item !== 'object') return null;
          const r = item as Record<string, unknown>;
          const id = typeof r.id === 'string' ? r.id.trim() : '';
          if (!id) return null;
          const elig =
            r.eligibility && typeof r.eligibility === 'object'
              ? (r.eligibility as Record<string, unknown>)
              : null;
          return {
            id,
            title: typeof r.title === 'string' ? r.title : id,
            ...(typeof r.suggested_agent_id === 'string' && r.suggested_agent_id.trim()
              ? { suggested_agent_id: r.suggested_agent_id.trim() }
              : {}),
            ...(typeof r.priority_class === 'string'
              ? { priority_class: r.priority_class }
              : {}),
            ...(typeof r.why_now === 'string' && r.why_now.trim()
              ? { why_now: r.why_now.trim() }
              : {}),
            ...(typeof r.template_available === 'string' && r.template_available.trim()
              ? { template_available: r.template_available.trim() }
              : {}),
            ...(elig
              ? {
                  eligibility: {
                    eligible: Boolean(elig.eligible),
                    reasons: Array.isArray(elig.reasons)
                      ? elig.reasons.map(String).filter(Boolean)
                      : [],
                    blocked_by: Array.isArray(elig.blocked_by)
                      ? elig.blocked_by.map(String).filter(Boolean)
                      : [],
                    ...(typeof elig.dependency_ready === 'boolean'
                      ? { dependency_ready: elig.dependency_ready }
                      : {}),
                    ...(typeof elig.execution_ready === 'boolean'
                      ? { execution_ready: elig.execution_ready }
                      : {}),
                    ...(typeof elig.blocked_reason === 'string'
                      ? { blocked_reason: elig.blocked_reason }
                      : {}),
                    ...(typeof elig.resolution === 'string'
                      ? { resolution: elig.resolution }
                      : {}),
                  },
                }
              : {}),
          } as PlanClaimableRow;
        })
        .filter((x): x is PlanClaimableRow => x != null)
    : [];
  const blocked_sample = Array.isArray(row.blocked_sample)
    ? row.blocked_sample
        .map((item) => {
          if (!item || typeof item !== 'object') return null;
          const r = item as Record<string, unknown>;
          const id = typeof r.id === 'string' ? r.id.trim() : '';
          if (!id) return null;
          return {
            id,
            title: typeof r.title === 'string' ? r.title : id,
            reasons: Array.isArray(r.reasons) ? r.reasons.map(String).filter(Boolean) : [],
            blocked_by: Array.isArray(r.blocked_by)
              ? r.blocked_by.map(String).filter(Boolean)
              : [],
          } as PlanBlockedSampleRow;
        })
        .filter((x): x is PlanBlockedSampleRow => x != null)
    : undefined;
  return {
    max_wip: typeof row.max_wip === 'number' ? row.max_wip : 3,
    wip_room: typeof row.wip_room === 'number' ? row.wip_room : 0,
    wip_full: Boolean(row.wip_full),
    in_progress_project:
      typeof row.in_progress_project === 'number' ? row.in_progress_project : 0,
    claimable,
    claimable_count:
      typeof row.claimable_count === 'number' ? row.claimable_count : claimable.length,
    ...(blocked_sample?.length ? { blocked_sample } : {}),
    ...(typeof row.active_goal_id === 'string' && row.active_goal_id.trim()
      ? { active_goal_id: row.active_goal_id.trim() }
      : {}),
    ...(() => {
      const holders = parseInProgressHolders(row.in_progress_holders);
      return holders ? { in_progress_holders: holders } : {};
    })(),
  };
}

/** ``agents.work_next`` read model — mirrors ``shared/work_graph/work_next.py`` WorkNextPacket. */
export type WorkNextState = 'executable' | 'blocked' | 'idle' | 'waiting' | 'actionable';

export type BlockedReason =
  | 'terminal'
  | 'waiting_input'
  | 'waiting_approval'
  | 'dependency_blocked'
  | 'planning_blocked'
  | 'decomposition_blocked'
  | 'already_claimed'
  | 'operator_closure'
  | 'no_compatible_agent'
  | 'provision_required'
  | 'wip_full'
  | 'role_mismatch'
  | 'skill_mismatch'
  | 'specialization_mismatch'
  | 'missing_capability'
  | 'internal_execution_error';

/** Fleet/template match provenance from execution score_breakdown (server-side resolver). */
export type MatchProvenance = {
  exact_specialization?: boolean;
  role_family?: string;
  capability_coverage?: number;
  task_class_match?: boolean;
  template_id?: string;
  node_specialization_id?: string;
  template_specialization_id?: string;
};

export type ExecutionSummaryPerNode = {
  node_id?: string;
  resolution?: string;
  execution_ready?: boolean;
  specialization_id?: string;
  compatible_templates?: string[];
  compatible_agents?: string[];
};

/** Plan validation execution dimension rollup (plan_validator). */
export type ExecutionSummary = {
  required_specializations?: string[];
  available_specializations?: string[];
  missing_specializations?: string[];
  provisionable_specializations?: string[];
  unavailable_specializations?: string[];
  /** True when optimize_plan meta-only patches do not flip execution_ready flags. */
  execution_flags_stable?: boolean;
  patch_count?: number;
  per_node?: ExecutionSummaryPerNode[];
};

export type WorkNextHandoff = {
  reason?: string;
  required_specialization_id?: string;
  required_role?: string;
  missing_capabilities?: string[];
  next_transition?: string;
};

export type WorkNextBlockedRow = {
  node_id?: string;
  title?: string;
  blocked_reason?: BlockedReason | string;
  /** Server copy when locale is set on work_next (copy_registry). */
  blocked_reason_label?: string;
  resolution?: string;
  required_role?: string;
  required_specialization_id?: string;
  /** Server copy when locale is set on work_next (copy_registry). */
  required_specialization_label?: string;
  next_transition?: string;
  handoff?: WorkNextHandoff;
  compatible_templates?: Array<Record<string, unknown>>;
  planning_artifact?: boolean;
  execution?: WorkNextExecution;
};

/** Read-only harness diagnostic projection (W4 — mirrors ``harness_state.project_harness_state``). */
export type HarnessStateProjection = {
  node_id?: string;
  work_lifecycle?: string;
  dependency_ready?: boolean;
  execution_ready?: boolean;
  executor_state?: string;
  claim_state?: string;
  blocked_reason?: string | null;
  provisionable?: boolean;
};

/** RBAC + fleet readiness from ``build_work_next_packet`` (D-RBAC / W13-03). */
export type ActionReadiness = {
  can_claim?: boolean;
  can_execute?: boolean;
  blocked_reason?: string | null;
  source?: string;
};

export type WorkNextNextWork = {
  node_id?: string;
  suggested_agent_id?: string;
  action_readiness?: ActionReadiness;
  [key: string]: unknown;
};

export type WorkNextViewerUrls = {
  dev?: string;
  user?: string;
  copilot_dev?: string;
  copilot_user?: string;
  /** Hosted site26 app shell `#/graph` on `/s/{pid}/app/`. */
  hosted_app?: string;
  /** Optional `graph` bucket alias (redirect to app shell). */
  hosted_graph_bucket?: string;
};

export type PanelManifest = {
  id: string;
  bytes: number;
  count: number;
  empty?: boolean;
};

export type ExpandWarning = {
  code: 'unknown_panel' | 'empty_panel' | string;
  id: string;
};

/** Rollup from ``agents.work_next`` diagnostics.readiness (RC-05). */
export type WorkNextReadinessRollup = {
  dependency_ready_leaves?: number;
  execution_ready_leaves?: number;
  claimable_leaves?: number;
};

export type WorkNextPacket = {
  goal?: { id?: string; title?: string; progress?: unknown };
  /** Server instruction focus (may differ from URL focus_node_id). */
  plan_focus?: { node_id?: string; goal_id?: string };
  state?: WorkNextState;
  /** Present on compact loop packets and full packets from build_work_next_packet. */
  project_id?: number;
  /** ``compact`` (default MCP) vs ``full`` — mirrors ``agents.work_next`` detail param. */
  detail?: 'compact' | 'full' | string;
  /** Focus node on compact projections; also on next_work.node_id when full. */
  node_id?: string;
  /** Goal id on compact packets. Full packets also carry goal.id. */
  goal_id?: string;
  /** 1-hop cards when expand is node:<id> or neighborhood. */
  graph_slice?: Record<string, unknown>;
  /** SPA deep links when server knows project_id + focus node (WG-P2-C). */
  viewer_urls?: WorkNextViewerUrls;
  planning_artifacts?: WorkNextBlockedRow[];
  planning_required?: WorkNextBlockedRow[];
  /** CAS revision on compact loop packets. */
  revision?: number;
  /** Blocked reason or recovery reason on compact loop packets. */
  reason?: string;
  /** rv-28 aliases when state is blocked (server also sends node_id / reason). */
  blocked_node_id?: string;
  blocked_reason_code?: string;
  loop_mode?: string;
  next_work?: WorkNextNextWork;
  blocked_work?: WorkNextBlockedRow[];
  blocked_work_page?: {
    items?: WorkNextBlockedRow[];
    next_cursor?: string | null;
  };
  plan_summary?: Record<string, unknown> & { scoped_to_goal?: boolean };
  goal_summary?: Record<string, unknown> & {
    progress_pct?: number;
    critical_path?: unknown;
    current_bottleneck?: Record<string, unknown>;
    goal_progress?: {
      completion_percent?: number;
      weighted_completion_percent?: number;
      node_mix?: {
        planning?: number;
        execution?: number;
        verification?: number;
        optional?: number;
      };
    };
  };
  claim?: {
    available?: boolean;
    lease_seconds?: number;
    wip_full?: boolean;
    in_progress_holders?: PlanInProgressHolderRow[];
  };
  /** Compact work_next hoist — same rows as claim.in_progress_holders without full fetch. */
  wip_items?: PlanInProgressHolderRow[];
  claim_result?: Record<string, unknown> & {
    claim_count?: number;
    error_code?: string;
    recovery_block?: { text?: string; next_actions?: unknown[] };
  };
  recovery?: Record<string, unknown>;
  /** Localized operator hint when state=blocked (mcp_recovery). */
  recovery_hint?: string;
  locale?: string;
  instruction_packet?: Record<string, unknown>;
  /** Goal-root pin inventory. Pointers survive step changes; bodies stay on the full packet skills. */
  pin_slots?: Array<{
    skill_id?: string;
    title?: string;
    reason?: string;
    mode?: 'pointer' | 'inline' | string;
    collapsed?: boolean;
    protected?: boolean;
  }>;
  /** Pass ``expand`` with panel ids from the tool schema. Value is the parameter name. */
  panels?: string;
  skills?: Array<Record<string, unknown>>;
  skills_disclosure?: Record<string, unknown>;
  next_actions?: Array<{ action?: string; params?: Record<string, unknown> }>;
  /** Compact hoist from server recovery ladder (merged into next_actions when absent). */
  recovery_actions?: Array<{ action?: string; params?: Record<string, unknown> }>;
  /** Canonical single-step projection — prefer over parsing next_actions[0]. */
  next_action?: { action?: string; params?: Record<string, unknown>; reason?: string };
  alternative_actions?: Array<{ action?: string; params?: Record<string, unknown> }>;
  /** Optional runtime diagnostics (harness v2 W4 + summary bottleneck). */
  diagnostics?: {
    harness_state?: HarnessStateProjection;
    bottleneck?: { node_id?: string; reason?: string };
    readiness?: WorkNextReadinessRollup;
    timings_ms?: Record<string, unknown>;
    execute_budget?: Record<string, unknown>;
    [key: string]:
      | string
      | number
      | boolean
      | HarnessStateProjection
      | WorkNextReadinessRollup
      | Record<string, unknown>
      | undefined;
  };
  /** result.v1 card from the execute batch root. */
  agent_os?: { follow?: string; pack_version?: number; [key: string]: unknown };
  /** W6 batch envelope fields (partial MCP execute / fleet mcpAgentsAction). */
  partial_success?: boolean;
  workflow_diagnostics?: WorkflowDiagnostic[];
  workflow_completion?: WorkflowCompletion;
  workflow_run_id?: string;
  goal_verification?: GoalVerificationWire;
  instruction_slice?: Record<string, unknown>;
  error_code?: string;
};

/** ``agents.ensure_agent`` result — includes optional follow-up ladder step. */
export type EnsureAgentResult = {
  node_id?: string;
  agent_id?: string | null;
  template_id?: string | null;
  blocked_reason?: string | null;
  created?: boolean;
  resolution?: string;
  next_action?: { action?: string; params?: Record<string, unknown> };
  next_actions?: Array<{ action?: string; params?: Record<string, unknown> }>;
};

/** ``plan_completion`` DTO — mirrors ``shared/mcp/completion_engine_v1.CompletionDecision``. */
export type PlanCompletionStatus =
  | 'passed'
  | 'blocked'
  | 'failed'
  | 'not_evaluable'
  | 'not_run'
  | 'verifying';

export type PlanCompletionEvidence = {
  allowed: boolean;
  status?: PlanCompletionStatus;
  accepted?: boolean;
  reasons?: string[];
  missing_evidence?: string[];
  predicates_satisfied?: string[];
  predicates_missing?: string[];
  next_action?: string;
};

export function parsePlanCompletionEvidence(raw: unknown): PlanCompletionEvidence | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  if (typeof row.allowed !== 'boolean') return null;
  const missing = Array.isArray(row.missing_evidence)
    ? row.missing_evidence.map(String).filter(Boolean)
    : Array.isArray(row.missing)
      ? row.missing.map(String).filter(Boolean)
      : undefined;
  const predicatesMissing = Array.isArray(row.predicates_missing)
    ? row.predicates_missing.map(String).filter(Boolean)
    : undefined;
  const predicatesSatisfied = Array.isArray(row.predicates_satisfied)
    ? row.predicates_satisfied.map(String).filter(Boolean)
    : undefined;
  const reasons = Array.isArray(row.reasons)
    ? row.reasons.map(String).filter(Boolean)
    : undefined;
  const status =
    typeof row.status === 'string' ? (row.status as PlanCompletionStatus) : undefined;
  return {
    allowed: row.allowed,
    ...(status ? { status } : {}),
    ...(typeof row.accepted === 'boolean' ? { accepted: row.accepted } : {}),
    ...(reasons?.length ? { reasons } : {}),
    ...(missing?.length ? { missing_evidence: missing } : {}),
    ...(predicatesSatisfied?.length ? { predicates_satisfied: predicatesSatisfied } : {}),
    ...(predicatesMissing?.length ? { predicates_missing: predicatesMissing } : {}),
    ...(typeof row.next_action === 'string' && row.next_action.trim()
      ? { next_action: row.next_action.trim() }
      : {}),
  };
}

/** ``agents.plan_execute`` typed handoff — mirrors ``shared/work_graph/plan_execute_result.py``. */
export type PlanExecuteResult = {
  success: boolean;
  node_id?: string;
  focus_node_id?: string;
  work_state?: WorkNextState | string;
  next_action?: { action?: string; params?: Record<string, unknown> };
  next_actions?: Array<{ action?: string; params?: Record<string, unknown> }>;
  action_readiness?: ActionReadiness;
  run?: Record<string, unknown>;
  run_succeeded?: boolean | null;
  plan_completion?: PlanCompletionEvidence | null;
  error_code?: string;
};

export function parsePlanExecuteResult(
  raw: unknown,
  opts?: { success?: boolean; focusNodeId?: string; errorCode?: string },
): PlanExecuteResult {
  const env = normalizeMcpToolEnvelope(raw);
  const base = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const data =
    env.data && typeof env.data === 'object'
      ? (env.data as Record<string, unknown>)
      : {};
  const row: Record<string, unknown> = { ...base, ...data, success: env.success };
  const focus =
    String(opts?.focusNodeId ?? row.focus_node_id ?? row.node_id ?? '').trim() || undefined;
  const nextAction =
    row.next_action && typeof row.next_action === 'object'
      ? (row.next_action as { action?: string; params?: Record<string, unknown> })
      : undefined;
  const nextActions = Array.isArray(row.next_actions)
    ? row.next_actions.filter(
        (a): a is { action?: string; params?: Record<string, unknown> } =>
          Boolean(a) && typeof a === 'object',
      )
    : undefined;
  const run = row.run && typeof row.run === 'object' ? (row.run as Record<string, unknown>) : undefined;
  const workStateRaw =
    typeof row.work_state === 'string'
      ? row.work_state
      : typeof row.state === 'string'
        ? row.state
        : undefined;
  const workState =
    workStateRaw === 'executable' ? 'actionable' : workStateRaw;
  const planCompletion = parsePlanCompletionEvidence(row.plan_completion);
  let actionReadiness =
    row.action_readiness && typeof row.action_readiness === 'object'
      ? (row.action_readiness as ActionReadiness)
      : undefined;
  if (!actionReadiness) {
    const nw = row.next_work;
    if (nw && typeof nw === 'object' && (nw as Record<string, unknown>).action_readiness) {
      const nested = (nw as Record<string, unknown>).action_readiness;
      if (nested && typeof nested === 'object') {
        actionReadiness = nested as ActionReadiness;
      }
    }
  }
  const runSucceeded =
    typeof row.run_succeeded === 'boolean'
      ? row.run_succeeded
      : run && typeof run.status === 'string'
        ? String(run.status).toLowerCase() === 'completed'
        : undefined;
  const errorCode =
    opts?.errorCode ??
    (typeof row.error_code === 'string' ? row.error_code : undefined);
  return {
    success: opts?.success ?? !errorCode,
    ...(focus ? { node_id: focus, focus_node_id: focus } : {}),
    ...(workState ? { work_state: workState as WorkNextState } : {}),
    ...(nextAction ? { next_action: nextAction } : {}),
    ...(nextActions?.length ? { next_actions: nextActions } : {}),
    ...(actionReadiness ? { action_readiness: actionReadiness } : {}),
    ...(run ? { run } : {}),
    ...(runSucceeded !== undefined ? { run_succeeded: runSucceeded } : {}),
    ...(planCompletion ? { plan_completion: planCompletion } : {}),
    ...(errorCode ? { error_code: errorCode } : {}),
  };
}

/** Read ``plan_completion`` from orchestrate / plan_execute run payloads (top-level or nested). */
export function extractPlanCompletionFromRun(run: unknown): PlanCompletionEvidence | null {
  if (!run || typeof run !== 'object') return null;
  const { data: envelopeData } = normalizeMcpToolEnvelope(run);
  const row: Record<string, unknown> = {
    ...envelopeData,
  };
  const structured = row.structuredContent;
  if (structured && typeof structured === 'object') {
    Object.assign(row, structured as Record<string, unknown>);
  }
  const direct = parsePlanCompletionEvidence(row.plan_completion);
  if (direct) return direct;
  const orch = row.orchestration;
  if (orch && typeof orch === 'object') {
    const ev = (orch as Record<string, unknown>).evidence;
    if (ev && typeof ev === 'object') {
      const nested = parsePlanCompletionEvidence(
        (ev as Record<string, unknown>).plan_completion,
      );
      if (nested) return nested;
    }
  }
  const spec = row.agent_run_spec;
  if (spec && typeof spec === 'object') {
    const specOrch = (spec as Record<string, unknown>).orchestration;
    if (specOrch && typeof specOrch === 'object') {
      const ev = (specOrch as Record<string, unknown>).evidence;
      if (ev && typeof ev === 'object') {
        return parsePlanCompletionEvidence((ev as Record<string, unknown>).plan_completion);
      }
    }
  }
  return null;
}

export type WorkNextExecution = {
  node_id?: string;
  execution_ready?: boolean;
  dependency_ready?: boolean;
  existing_executor_available?: boolean;
  provisionable?: boolean;
  executable_now?: boolean;
  executable_after_provision?: boolean;
  blocked_reason?: BlockedReason | string;
  resolution?: string;
  compatible_templates?: Array<{
    template_id?: string;
    score?: number;
    reasons?: string[];
    score_breakdown?: {
      cap_score?: number;
      role_score?: number;
      preferred_boost?: number;
      composite?: number;
      match_provenance?: MatchProvenance;
    };
    match_provenance?: MatchProvenance;
  }>;
  execution_summary?: ExecutionSummary;
  missing_requirements?: Array<{
    role?: string;
    provisionable?: boolean;
    templates?: string[];
    executable_now?: boolean;
    executable_after_provision?: boolean;
  }>;
  fully_provisionable?: boolean;
  partially_provisionable?: boolean;
  conditions?: Array<{ type?: string; status?: string; reason?: string }>;
  next_transition?: string;
  specialization_id?: string;
  handoff?: WorkNextHandoff;
  agent_eligible?: boolean;
  derived_specialization?: boolean;
};

export function parseWorkNextExecution(raw: unknown): WorkNextExecution | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const row = raw as Record<string, unknown>;
  const exec = (row.execution ?? row) as Record<string, unknown>;
  return {
    ...(typeof exec.node_id === 'string' ? { node_id: exec.node_id } : {}),
    ...(typeof exec.execution_ready === 'boolean' ? { execution_ready: exec.execution_ready } : {}),
    ...(typeof exec.dependency_ready === 'boolean' ? { dependency_ready: exec.dependency_ready } : {}),
    ...(typeof exec.existing_executor_available === 'boolean'
      ? { existing_executor_available: exec.existing_executor_available }
      : {}),
    ...(typeof exec.provisionable === 'boolean' ? { provisionable: exec.provisionable } : {}),
    ...(typeof exec.executable_now === 'boolean' ? { executable_now: exec.executable_now } : {}),
    ...(typeof exec.executable_after_provision === 'boolean'
      ? { executable_after_provision: exec.executable_after_provision }
      : {}),
    ...(typeof exec.blocked_reason === 'string' ? { blocked_reason: exec.blocked_reason } : {}),
    ...(typeof exec.resolution === 'string' ? { resolution: exec.resolution } : {}),
    ...(Array.isArray(exec.compatible_templates)
      ? {
          compatible_templates: exec.compatible_templates.map((tpl) => {
            if (!tpl || typeof tpl !== 'object') return tpl;
            const row = tpl as Record<string, unknown>;
            const breakdown =
              row.score_breakdown && typeof row.score_breakdown === 'object'
                ? (row.score_breakdown as Record<string, unknown>)
                : null;
            const provenance =
              row.match_provenance && typeof row.match_provenance === 'object'
                ? (row.match_provenance as MatchProvenance)
                : breakdown?.match_provenance && typeof breakdown.match_provenance === 'object'
                  ? (breakdown.match_provenance as MatchProvenance)
                  : undefined;
            const out: NonNullable<WorkNextExecution['compatible_templates']>[number] = {
              ...(typeof row.template_id === 'string' ? { template_id: row.template_id } : {}),
              ...(typeof row.score === 'number' ? { score: row.score } : {}),
              ...(Array.isArray(row.reasons)
                ? { reasons: row.reasons.map(String).filter(Boolean) }
                : {}),
              ...(breakdown ? { score_breakdown: breakdown as NonNullable<WorkNextExecution['compatible_templates']>[number]['score_breakdown'] } : {}),
              ...(provenance ? { match_provenance: provenance } : {}),
            };
            return out;
          }) as WorkNextExecution['compatible_templates'],
        }
      : {}),
    ...(exec.execution_summary && typeof exec.execution_summary === 'object'
      ? { execution_summary: exec.execution_summary as ExecutionSummary }
      : {}),
    ...(Array.isArray(exec.missing_requirements)
      ? { missing_requirements: exec.missing_requirements as WorkNextExecution['missing_requirements'] }
      : {}),
    ...(typeof exec.fully_provisionable === 'boolean'
      ? { fully_provisionable: exec.fully_provisionable }
      : {}),
    ...(typeof exec.partially_provisionable === 'boolean'
      ? { partially_provisionable: exec.partially_provisionable }
      : {}),
    ...(Array.isArray(exec.conditions)
      ? { conditions: exec.conditions as WorkNextExecution['conditions'] }
      : {}),
    ...(typeof exec.next_transition === 'string' ? { next_transition: exec.next_transition } : {}),
    ...(typeof exec.specialization_id === 'string'
      ? { specialization_id: exec.specialization_id }
      : {}),
    ...(exec.handoff && typeof exec.handoff === 'object'
      ? { handoff: exec.handoff as WorkNextHandoff }
      : {}),
    ...(typeof exec.agent_eligible === 'boolean' ? { agent_eligible: exec.agent_eligible } : {}),
    ...(typeof exec.derived_specialization === 'boolean'
      ? { derived_specialization: exec.derived_specialization }
      : {}),
  };
}

type RecoveryNodePacket = {
  target_node_id?: string;
  next_actions?: Array<{ params?: { node_id?: string } }>;
};

/** Node id for global recovery CTA — mirrors frontend blockedWorkHelpers. */
export function recoveryNodeIdForBlockedWork(
  rows: WorkNextBlockedRow[],
  recovery?: RecoveryNodePacket,
): string | undefined {
  const fromTarget = String(recovery?.target_node_id ?? '').trim();
  if (fromTarget) return fromTarget;
  const fromAction = String(recovery?.next_actions?.[0]?.params?.node_id ?? '').trim();
  if (fromAction) return fromAction;
  for (const row of rows) {
    const handoff =
      row.execution?.next_transition === 'handoff' ||
      row.blocked_reason === 'role_mismatch' ||
      row.blocked_reason === 'specialization_mismatch' ||
      row.blocked_reason === 'skill_mismatch';
    if (handoff && row.node_id) return String(row.node_id);
  }
  for (const row of rows) {
    if (row.execution?.fully_provisionable && row.node_id) {
      return String(row.node_id);
    }
  }
  const first = String(rows[0]?.node_id ?? '').trim();
  return first || undefined;
}

/** Wire name is `actionable`; `executable` is the pre-0.4.22 alias. */
export function isWorkNextActionableState(state?: string | null): boolean {
  const name = String(state ?? '').trim();
  return name === 'actionable' || name === 'executable';
}

/** False when server RBAC/fleet marked claim unavailable (W13-03). */
export function canClaimFromWorkNext(packet?: WorkNextPacket | null): boolean {
  if (!packet) return false;
  if (packet.claim?.available === false) return false;
  const readiness = packet.next_work?.action_readiness;
  if (readiness && readiness.can_claim === false) return false;
  return true;
}

/** False when server marked execute unavailable (D-RBAC / post-plan_execute handoff). */
export function canExecuteFromActionReadiness(
  readiness?: ActionReadiness | null,
): boolean {
  if (!readiness) return true;
  if (readiness.can_execute === false) return false;
  return true;
}

export function canExecuteFromWorkNext(packet?: WorkNextPacket | null): boolean {
  if (!packet) return true;
  const readiness = packet.next_work?.action_readiness;
  return canExecuteFromActionReadiness(readiness);
}

/** Operator-facing hint when execute/claim blocked by RBAC. */
export function actionReadinessUserHint(
  readiness?: ActionReadiness | null,
): string | undefined {
  const reason = String(readiness?.blocked_reason ?? '').trim();
  if (!reason) return undefined;
  return reason.replace(/^rbac_blocked:/, 'Permission denied: ');
}

/** CAS revision: next_action params → compact packet.revision → orchestrator graph revision. */
export function claimRevisionFromPacket(
  packet?: WorkNextPacket | null,
  graphRevision?: number,
): number | undefined {
  const fromAction = packet?.next_action?.params?.if_match_revision;
  if (typeof fromAction === 'number') return fromAction;
  const fromList = packet?.next_actions?.[0]?.params?.if_match_revision;
  if (typeof fromList === 'number') return fromList;
  const fromPacket = packet?.revision;
  if (typeof fromPacket === 'number' && fromPacket > 0) return fromPacket;
  if (typeof graphRevision === 'number') return graphRevision;
  return undefined;
}

function mergeClaimCasParams(
  params: Record<string, unknown>,
  packet?: WorkNextPacket | null,
  graphRevision?: number,
): Record<string, unknown> {
  if (params.if_match_revision != null) return params;
  const rev = claimRevisionFromPacket(packet, graphRevision);
  if (rev == null) return params;
  return { ...params, if_match_revision: rev };
}

export type WorkGraphActionPick = {
  action?: string;
  params?: Record<string, unknown>;
  reason?: string;
  resolution?: {
    mode?: string;
    candidates?: Array<{
      template_id?: string;
      score?: number;
      score_breakdown?: Record<string, number>;
    }>;
  };
};

function pickWorkGraphActionRow(row: unknown): WorkGraphActionPick | undefined {
  if (!row || typeof row !== 'object') return undefined;
  const r = row as Record<string, unknown>;
  const action = String(r.action ?? '').trim();
  if (!action) return undefined;
  const out: WorkGraphActionPick = { action };
  if (r.params && typeof r.params === 'object') {
    out.params = r.params as Record<string, unknown>;
  }
  const reason = String(r.reason ?? '').trim();
  if (reason) out.reason = reason;
  if (r.resolution && typeof r.resolution === 'object') {
    out.resolution = r.resolution as WorkGraphActionPick['resolution'];
  }
  return out;
}

function isChooseTemplateWorkGraphAction(
  row: WorkGraphActionPick | undefined,
): boolean {
  return (
    row?.action === 'agents.create_from_template' &&
    row.resolution?.mode === 'choose_template' &&
    (row.resolution.candidates?.length ?? 0) > 0
  );
}

/** Prefer canonical next_action over recovery.next_actions[0] (finalization W8). */
export function primaryWorkGraphAction(packet?: WorkNextPacket | null): WorkGraphActionPick | undefined {
  if (!packet) return undefined;
  const canonical = pickWorkGraphActionRow(packet.next_action);
  if (canonical) return canonical;
  const fromList = pickWorkGraphActionRow(packet.next_actions?.[0]);
  if (fromList) return fromList;
  const recovery = packet.recovery as { next_actions?: unknown[] } | undefined;
  const fromRecovery = pickWorkGraphActionRow(recovery?.next_actions?.[0]);
  if (fromRecovery) return fromRecovery;
  return undefined;
}

/** UI recovery picker — prefer choose_template row with candidates over stripped canonical. */
export function primaryRecoveryNextAction(
  packet?: WorkNextPacket | null,
): WorkGraphActionPick | undefined {
  if (!packet) return undefined;
  const recovery = packet.recovery as { next_actions?: unknown[] } | undefined;
  const scan: unknown[] = [
    ...(packet.next_actions ?? []),
    ...(recovery?.next_actions ?? []),
    packet.next_action,
  ];
  for (const row of scan) {
    const picked = pickWorkGraphActionRow(row);
    if (isChooseTemplateWorkGraphAction(picked)) return picked;
  }
  return primaryWorkGraphAction(packet);
}

/** Parse work_next after merging MCP batch meta (W6 envelope). */
export function parseWorkNextFromMcpExecute(
  raw: unknown,
  batchMeta?: Record<string, unknown> | null,
): WorkNextPacket {
  const base =
    raw && typeof raw === 'object' && !Array.isArray(raw)
      ? { ...(raw as Record<string, unknown>) }
      : {};
  const merged = mergeExecuteEnvelopeIntoPacket(base, batchMeta);
  const out = parseWorkNextPacket(merged);
  if (batchMeta && batchEnvelopeHasWorkGraphBlock(batchMeta)) {
    const nw = out.next_work ?? { node_id: out.node_id };
    const readiness = nw.action_readiness ?? {};
    return {
      ...out,
      partial_success: true,
      error_code: out.error_code ?? 'work_graph_blocked',
      next_work: {
        ...nw,
        action_readiness: {
          ...readiness,
          can_claim: false,
          blocked_reason: readiness.blocked_reason ?? 'work_graph_blocked',
        },
      },
    };
  }
  return out;
}

export function parseWorkNextPacket(raw: unknown): WorkNextPacket {
  if (!raw || typeof raw !== 'object') return {};
  const base = raw as Record<string, unknown>;
  const { data: envelopeData } = normalizeMcpToolEnvelope(raw);
  const row =
    envelopeData && Object.keys(envelopeData).length > 0
      ? { ...base, ...envelopeData }
      : base;
  const isCompact = row.detail === 'compact';
  const topNodeId = typeof row.node_id === 'string' ? row.node_id.trim() : '';
  const blocked = Array.isArray(row.blocked_work)
    ? row.blocked_work
        .filter((item) => item && typeof item === 'object')
        .map((item) => {
          const blockedRow = item as WorkNextBlockedRow;
          const execution = parseWorkNextExecution(blockedRow.execution ?? blockedRow);
          if (!execution) return blockedRow;
          const handoff =
            blockedRow.handoff ??
            (execution.handoff ??
              (execution.next_transition === 'handoff' ||
              blockedRow.blocked_reason === 'specialization_mismatch' ||
              blockedRow.blocked_reason === 'role_mismatch'
                ? {
                    reason: String(blockedRow.blocked_reason || execution.blocked_reason || ''),
                    required_specialization_id:
                      blockedRow.required_specialization_id || execution.specialization_id,
                    required_role: blockedRow.required_role,
                    next_transition: execution.next_transition || 'handoff',
                  }
                : undefined));
          return {
            ...blockedRow,
            execution,
            ...(handoff ? { handoff } : {}),
            ...(execution.compatible_templates?.length && !blockedRow.compatible_templates
              ? { compatible_templates: execution.compatible_templates }
              : {}),
          };
        })
    : undefined;
  const recovery =
    row.recovery && typeof row.recovery === 'object'
      ? (row.recovery as Record<string, unknown>)
      : undefined;
  const parseActionRows = (raw: unknown) =>
    Array.isArray(raw)
      ? (raw.filter((item) => item && typeof item === 'object') as Array<{
          action?: string;
          params?: Record<string, unknown>;
        }>)
      : undefined;
  const recovery_actions = parseActionRows(row.recovery_actions);
  const next_actions =
    parseActionRows(row.next_actions) ??
    (recovery_actions?.length ? recovery_actions : undefined);
  const claimRaw =
    row.claim && typeof row.claim === 'object'
      ? (row.claim as Record<string, unknown>)
      : undefined;
  const claim = claimRaw
    ? {
        ...(typeof claimRaw.available === 'boolean' ? { available: claimRaw.available } : {}),
        ...(typeof claimRaw.lease_seconds === 'number'
          ? { lease_seconds: claimRaw.lease_seconds }
          : {}),
        ...(typeof claimRaw.wip_full === 'boolean' ? { wip_full: claimRaw.wip_full } : {}),
        ...(parseInProgressHolders(claimRaw.in_progress_holders)
          ? { in_progress_holders: parseInProgressHolders(claimRaw.in_progress_holders) }
          : {}),
      }
    : undefined;
  const wipItems =
    parseInProgressHolders(row.wip_items) ??
    (claimRaw ? parseInProgressHolders(claimRaw.wip_items) : undefined);
  const goal =
    row.goal && typeof row.goal === 'object'
      ? (row.goal as { id?: string; title?: string; progress?: unknown })
      : undefined;
  const viewerUrls =
    row.viewer_urls && typeof row.viewer_urls === 'object'
      ? (row.viewer_urls as WorkNextViewerUrls)
      : undefined;
  const planningArtifacts = Array.isArray(row.planning_artifacts)
    ? (row.planning_artifacts.filter((item) => item && typeof item === 'object') as WorkNextBlockedRow[])
    : undefined;
  const planningRequired = Array.isArray(row.planning_required)
    ? (row.planning_required.filter((item) => item && typeof item === 'object') as WorkNextBlockedRow[])
    : undefined;
  let nextWork: WorkNextNextWork | undefined;
  if (row.next_work && typeof row.next_work === 'object') {
    const nw = { ...(row.next_work as Record<string, unknown>) };
    const sid = String(nw.suggested_agent_id ?? '').trim();
    if (sid) nw.suggested_agent_id = sid;
    else delete nw.suggested_agent_id;
    nextWork = nw as WorkNextNextWork;
  } else if (isCompact && topNodeId) {
    nextWork = { node_id: topNodeId };
  }
  const topReadiness =
    row.action_readiness && typeof row.action_readiness === 'object'
      ? (row.action_readiness as WorkNextNextWork['action_readiness'])
      : undefined;
  if (!nextWork && topNodeId && topReadiness) {
    nextWork = { node_id: topNodeId, action_readiness: topReadiness };
  }
  if (nextWork && topReadiness && !nextWork.action_readiness) {
    nextWork = { ...nextWork, action_readiness: topReadiness };
  }
  const projectId =
    typeof row.project_id === 'number' && row.project_id > 0 ? row.project_id : undefined;
  const nodeId = topNodeId || (nextWork?.node_id ? String(nextWork.node_id) : undefined);
  const wireState =
    typeof row.state === 'string'
      ? row.state
      : typeof row.work_state === 'string'
        ? row.work_state
        : '';
  const inferredState: WorkNextState | undefined =
    wireState
      ? ((wireState === 'executable' ? 'actionable' : wireState) as WorkNextState)
      : blocked?.length
        ? 'blocked'
        : undefined;
  return {
    ...(goal ? { goal } : {}),
    ...(inferredState ? { state: inferredState } : {}),
    ...(projectId ? { project_id: projectId } : {}),
    ...(typeof row.detail === 'string' && row.detail.trim()
      ? { detail: row.detail.trim() }
      : {}),
    ...(nodeId ? { node_id: nodeId } : {}),
    ...(typeof row.goal_id === 'string' && row.goal_id.trim()
      ? { goal_id: row.goal_id.trim() }
      : {}),
    ...(row.graph_slice && typeof row.graph_slice === 'object'
      ? { graph_slice: row.graph_slice as Record<string, unknown> }
      : {}),
    ...(viewerUrls ? { viewer_urls: viewerUrls } : {}),
    ...(planningArtifacts?.length ? { planning_artifacts: planningArtifacts } : {}),
    ...(planningRequired?.length ? { planning_required: planningRequired } : {}),
    ...(typeof row.revision === 'number' ? { revision: row.revision } : {}),
    ...(typeof row.reason === 'string' && row.reason.trim() ? { reason: row.reason.trim() } : {}),
    ...(typeof row.blocked_node_id === 'string' && row.blocked_node_id.trim()
      ? { blocked_node_id: row.blocked_node_id.trim() }
      : {}),
    ...(typeof row.blocked_reason_code === 'string' && row.blocked_reason_code.trim()
      ? { blocked_reason_code: row.blocked_reason_code.trim() }
      : {}),
    ...(nextWork ? { next_work: nextWork } : {}),
    ...(blocked?.length ? { blocked_work: blocked } : {}),
    ...(row.plan_summary && typeof row.plan_summary === 'object'
      ? { plan_summary: row.plan_summary as Record<string, unknown> }
      : {}),
    ...(row.goal_summary && typeof row.goal_summary === 'object'
      ? { goal_summary: row.goal_summary as Record<string, unknown> }
      : {}),
    ...(claim ? { claim } : {}),
    ...(wipItems ? { wip_items: wipItems } : {}),
    ...(row.claim_result && typeof row.claim_result === 'object'
      ? { claim_result: row.claim_result as Record<string, unknown> }
      : {}),
    ...(recovery ? { recovery } : {}),
    ...(typeof row.recovery_hint === 'string' && row.recovery_hint.trim()
      ? { recovery_hint: row.recovery_hint.trim() }
      : {}),
    ...(typeof row.locale === 'string' && row.locale.trim()
      ? { locale: row.locale.trim() }
      : {}),
    ...(row.instruction_packet && typeof row.instruction_packet === 'object'
      ? { instruction_packet: row.instruction_packet as Record<string, unknown> }
      : {}),
    ...(Array.isArray(row.pin_slots) && row.pin_slots.length
      ? {
          pin_slots: row.pin_slots.filter(
            (item) => item && typeof item === 'object',
          ) as NonNullable<WorkNextPacket['pin_slots']>,
        }
      : {}),
    ...(typeof row.panels === 'string' && row.panels.trim()
      ? { panels: row.panels.trim() }
      : {}),
    ...(Array.isArray(row.skills) && row.skills.length
      ? { skills: row.skills as NonNullable<WorkNextPacket['skills']> }
      : {}),
    ...(row.skills_disclosure && typeof row.skills_disclosure === 'object'
      ? { skills_disclosure: row.skills_disclosure as Record<string, unknown> }
      : {}),
    ...(next_actions?.length ? { next_actions } : {}),
    ...(row.next_action && typeof row.next_action === 'object'
      ? {
          next_action: row.next_action as {
            action?: string;
            params?: Record<string, unknown>;
            reason?: string;
          },
        }
      : {}),
    ...(Array.isArray(row.alternative_actions) && row.alternative_actions.length
      ? {
          alternative_actions: row.alternative_actions.filter(
            (item) => item && typeof item === 'object',
          ) as Array<{ action?: string; params?: Record<string, unknown> }>,
        }
      : {}),
    ...(row.diagnostics && typeof row.diagnostics === 'object'
      ? { diagnostics: parseWorkNextDiagnostics(row.diagnostics) }
      : {}),
    ...(row.plan_focus && typeof row.plan_focus === 'object'
      ? { plan_focus: row.plan_focus as WorkNextPacket['plan_focus'] }
      : {}),
    ...(typeof row.loop_mode === 'string' && row.loop_mode.trim()
      ? { loop_mode: row.loop_mode.trim() }
      : {}),
    ...(row.blocked_work_page && typeof row.blocked_work_page === 'object'
      ? {
          blocked_work_page: row.blocked_work_page as WorkNextPacket['blocked_work_page'],
        }
      : {}),
    ...(row.partial_success === true ? { partial_success: true } : {}),
    ...(Array.isArray(row.workflow_diagnostics)
      ? { workflow_diagnostics: row.workflow_diagnostics as WorkflowDiagnostic[] }
      : {}),
    ...(row.workflow_completion && typeof row.workflow_completion === 'object'
      ? { workflow_completion: row.workflow_completion as WorkflowCompletion }
      : {}),
    ...(typeof row.workflow_run_id === 'string' && row.workflow_run_id.trim()
      ? { workflow_run_id: row.workflow_run_id.trim() }
      : {}),
    ...(row.goal_verification && typeof row.goal_verification === 'object'
      ? { goal_verification: row.goal_verification as GoalVerificationWire }
      : {}),
    ...(row.instruction_slice && typeof row.instruction_slice === 'object'
      ? { instruction_slice: row.instruction_slice as Record<string, unknown> }
      : {}),
    ...(typeof row.error_code === 'string' && row.error_code.trim()
      ? { error_code: row.error_code.trim() }
      : {}),
  };
}

function parseWorkNextDiagnostics(raw: unknown): NonNullable<WorkNextPacket['diagnostics']> {
  const diag = raw as Record<string, unknown>;
  const harness =
    diag.harness_state && typeof diag.harness_state === 'object'
      ? (diag.harness_state as HarnessStateProjection)
      : undefined;
  const bottleneck =
    diag.bottleneck && typeof diag.bottleneck === 'object'
      ? (diag.bottleneck as NonNullable<WorkNextPacket['diagnostics']>['bottleneck'])
      : undefined;
  const out: NonNullable<WorkNextPacket['diagnostics']> = {
    ...(harness ? { harness_state: harness } : {}),
    ...(bottleneck ? { bottleneck } : {}),
  };
  const readiness =
    diag.readiness && typeof diag.readiness === 'object' && !Array.isArray(diag.readiness)
      ? (diag.readiness as WorkNextReadinessRollup)
      : undefined;
  if (readiness) {
    out.readiness = readiness;
  }
  for (const key of ['timings_ms', 'execute_budget'] as const) {
    const value = diag[key];
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      (out as Record<string, unknown>)[key] = value;
    }
  }
  for (const [key, value] of Object.entries(diag)) {
    if (
      key === 'harness_state' ||
      key === 'bottleneck' ||
      key === 'readiness' ||
      key === 'timings_ms' ||
      key === 'execute_budget'
    ) {
      continue;
    }
    if (key === 'plan_patch_recovery' && value && typeof value === 'object' && !Array.isArray(value)) {
      (out as Record<string, unknown>)[key] = value;
      continue;
    }
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      (out as Record<string, unknown>)[key] = value;
    }
  }
  return out;
}

/** CL-23-14 — shared MCP/REST error → work_next handoff (Copilot + followWorkGraphAction). */
export type WorkGraphErrorToPacketContext = {
  projectId?: number;
  envUuid?: string;
  home?: 'project' | 'self' | 'project_self';
  nodeId?: string;
  agentId?: string;
  goalId?: string;
};

/** Unwrap MCP step / REST body; merge AgentsFleet `batchMeta` (W6 envelope fields). */
export function workGraphErrorBody(err: unknown): Record<string, unknown> | undefined {
  let body: Record<string, unknown> | undefined;
  if (err && typeof err === 'object' && !(err instanceof Error)) {
    const plain = err as Record<string, unknown>;
    if (
      typeof plain.error_code === 'string' ||
      plain.next_action != null ||
      plain.recovery != null
    ) {
      body = plain;
    }
  }
  const step = (err as { step?: { data?: unknown; result?: unknown } }).step;
  if (step && typeof step === 'object') {
    const raw = (step as { data?: unknown }).data ?? (step as { result?: unknown }).result;
    if (raw && typeof raw === 'object') {
      body = { ...(body ?? {}), ...(raw as Record<string, unknown>) };
    }
  }
  if (!body) {
    const responseData = (err as { response?: { data?: Record<string, unknown> } }).response
      ?.data;
    if (responseData && typeof responseData === 'object') body = responseData;
  }
  if (!body && err && typeof err === 'object' && !(err instanceof Error)) {
    const nested = (err as { data?: Record<string, unknown> }).data;
    if (nested && typeof nested === 'object') body = nested;
  }
  if (body) {
    const responseNested = (body as { response?: { data?: Record<string, unknown> } }).response
      ?.data;
    if (responseNested && typeof responseNested === 'object') {
      body = { ...body, ...responseNested };
    }
  }
  const batchMeta = (err as { batchMeta?: Record<string, unknown> }).batchMeta;
  if (!batchMeta || typeof batchMeta !== 'object') {
    return body ? normalizeMcpWorkGraphPayload(body) : body;
  }
  const out: Record<string, unknown> = { ...(body ?? {}) };
  if (Array.isArray(batchMeta.workflow_diagnostics)) {
    const existing = out.workflow_diagnostics;
    out.workflow_diagnostics = Array.isArray(existing)
      ? [...existing, ...batchMeta.workflow_diagnostics]
      : batchMeta.workflow_diagnostics;
  }
  if (batchMeta.workflow_completion && !out.workflow_completion) {
    out.workflow_completion = batchMeta.workflow_completion;
  }
  const runId = String(batchMeta.workflow_run_id ?? '').trim();
  if (runId && !out.workflow_run_id) out.workflow_run_id = runId;
  const gv = goalVerificationFromEnvelope({ ...out, ...batchMeta });
  if (gv) out.goal_verification = gv;
  return normalizeMcpWorkGraphPayload(out);
}

/** MCP batch workflow diagnostic code → dispatchable recovery action (SDK + Copilot).
 *  Server mirror: shared/mcp/workflow_diagnostic_recovery.py */
export const WORKFLOW_DIAGNOSTIC_RECOVERY_ACTIONS: Record<string, string> = {
  workflow_batch_bind_failed: 'agents.reconcile_binding',
  workflow_batch_context_bind_failed: 'agents.reconcile_binding',
  workflow_state_key_stamp_failed: 'agents.reconcile_binding',
  work_next_enrich_failed: 'agents.work_next',
  work_next_repeat_reconcile_failed: 'agents.reconcile_binding',
  workflow_inverse_sync_failed: 'agents.reconcile_binding',
  guidance_user_row_not_found: 'agents.work_next',
  orchestrator_binding_stale: 'agents.reconcile_binding',
  orchestrator_unconfigured: 'agents.reconcile_binding',
  unconfigured: 'agents.reconcile_binding',
  workflow_batch_receipt_failed: 'agents.reconcile_binding',
  workflow_batch_bind_skipped: 'agents.work_next',
  workflow_receipt_context_missing: 'agents.reconcile_binding',
  workflow_receipt_unbound: 'agents.reconcile_binding',
  workflow_step_stalled: 'agents.plan_recovery_scan',
  workflow_step_not_advancing: 'agents.plan_recovery_scan',
  work_next_hydrate_failed: 'agents.work_next',
};

const WORKFLOW_DIAG_CODE_TO_ACTION = WORKFLOW_DIAGNOSTIC_RECOVERY_ACTIONS;

export function workflowDiagnosticRecoveryParams(
  code: string,
  projectId?: number,
): Record<string, unknown> {
  const params: Record<string, unknown> = {};
  if (projectId != null) params.project_id = projectId;
  if (code === 'guidance_user_row_not_found' || code === 'work_next_enrich_failed') {
    params.handoff = true;
  }
  if (code === 'work_next_enrich_failed') {
    params.detail = 'compact';
  } else if (code !== 'guidance_user_row_not_found') {
    params.repair = true;
  }
  return params;
}

function recoveryFromWorkflowDiagnostics(
  data: Record<string, unknown>,
  ctx?: WorkGraphErrorToPacketContext,
): Record<string, unknown> | undefined {
  const diags = data.workflow_diagnostics;
  if (!Array.isArray(diags)) return undefined;
  for (const row of diags) {
    if (!row || typeof row !== 'object') continue;
    const r = row as Record<string, unknown>;
    const explicit = String(r.action ?? '').trim();
    if (explicit) {
      const params = r.params && typeof r.params === 'object' ? r.params : {};
      return { action: explicit, params };
    }
    const code = String(r.code ?? '').trim();
    const mapped = WORKFLOW_DIAG_CODE_TO_ACTION[code];
    if (mapped) {
      const params = workflowDiagnosticRecoveryParams(code, ctx?.projectId);
      return { action: mapped, params };
    }
  }
  return undefined;
}

const PGVE_PREFER_NESTED_RECOVERY = new Set([
  'plan_completion_gates',
  'plan_graph_children_exceeded',
  'plan_ops_unknown',
]);

function pgveCodeFromErrorData(data: Record<string, unknown>): string {
  return String(data.code ?? data.error_code ?? '').trim();
}

function recoveryNextActionFromBody(
  data: Record<string, unknown>,
): Record<string, unknown> | undefined {
  const stepData = (data.step as { data?: Record<string, unknown> } | undefined)?.data;
  if (stepData && typeof stepData === 'object') {
    const fromStep = recoveryNextActionFromBody(stepData);
    if (fromStep) return fromStep;
  }
  const pgveCode = pgveCodeFromErrorData(data);
  if (PGVE_PREFER_NESTED_RECOVERY.has(pgveCode)) {
    const rec = data.recovery;
    if (rec && typeof rec === 'object' && !Array.isArray(rec)) {
      const nested = (rec as Record<string, unknown>).next_action;
      if (
        nested &&
        typeof nested === 'object' &&
        String((nested as { action?: string }).action ?? '').trim()
      ) {
        return nested as Record<string, unknown>;
      }
    }
  }
  const na = data.next_action;
  if (na && typeof na === 'object' && String((na as { action?: string }).action ?? '').trim()) {
    return na as Record<string, unknown>;
  }
  const rb = data.recovery_block;
  if (rb && typeof rb === 'object') {
    const block = rb as Record<string, unknown>;
    const blockNa = block.next_action;
    if (
      blockNa &&
      typeof blockNa === 'object' &&
      String((blockNa as { action?: string }).action ?? '').trim()
    ) {
      return blockNa as Record<string, unknown>;
    }
    const blockActions = block.next_actions;
    if (Array.isArray(blockActions) && blockActions.length) {
      const first = blockActions[0];
      if (
        first &&
        typeof first === 'object' &&
        String((first as { action?: string }).action ?? '').trim()
      ) {
        return first as Record<string, unknown>;
      }
    }
  }
  const actions = data.next_actions;
  if (Array.isArray(actions) && actions.length) {
    const first = actions[0];
    if (first && typeof first === 'object' && String((first as { action?: string }).action ?? '').trim()) {
      return first as Record<string, unknown>;
    }
  }
  const rec = data.recovery;
  if (!rec || typeof rec !== 'object') return undefined;
  if (Array.isArray(rec) && rec.length) {
    const first = rec[0];
    if (first && typeof first === 'object' && String((first as { action?: string }).action ?? '').trim()) {
      return first as Record<string, unknown>;
    }
    return undefined;
  }
  const r = rec as Record<string, unknown>;
  const nested = r.next_action;
  if (
    nested &&
    typeof nested === 'object' &&
    String((nested as { action?: string }).action ?? '').trim()
  ) {
    return nested as Record<string, unknown>;
  }
  const action = String(r.action ?? '').trim();
  if (!action) return undefined;
  const params = r.params;
  return { action, params: params && typeof params === 'object' ? params : {} };
}

function applyWorkGraphErrorContext(
  nextAction: Record<string, unknown>,
  ctx?: WorkGraphErrorToPacketContext,
): Record<string, unknown> {
  const params: Record<string, unknown> = {
    ...((nextAction.params as Record<string, unknown>) || {}),
  };
  if (ctx?.projectId != null && params.project_id == null) params.project_id = ctx.projectId;
  if (ctx?.nodeId && !params.node_id) params.node_id = ctx.nodeId;
  if (ctx?.agentId && !params.agent_id) params.agent_id = ctx.agentId;
  const scopedGoal = explicitGoalId(ctx?.goalId);
  if (scopedGoal && !params.goal_id) params.goal_id = scopedGoal;
  const actionHome = ctx?.home;
  let finalized: Record<string, unknown>;
  if (actionHome && isPersonalGraphHome(actionHome)) {
    finalized = { ...params, ...mcpGraphHomeFields(actionHome) };
    delete finalized.env_uuid;
  } else {
    finalized = mergeEnvUuidParam(params, ctx?.envUuid);
  }
  return { ...nextAction, params: finalized };
}

function syntheticWorkGraphPacketFromCode(
  code: string,
  data: Record<string, unknown>,
  ctx?: WorkGraphErrorToPacketContext,
): WorkNextPacket | null {
  const stepNa =
    (data.next_action as Record<string, unknown> | undefined) ??
    ((data.step as { data?: { next_action?: unknown } })?.data?.next_action as
      | Record<string, unknown>
      | undefined);
  const params =
    (stepNa?.params as Record<string, unknown> | undefined) ??
    (data.params as Record<string, unknown> | undefined) ??
    {};
  const nodeId = String(params.node_id ?? data.node_id ?? ctx?.nodeId ?? '').trim();
  const projectId = params.project_id ?? data.project_id ?? ctx?.projectId;

  if (code === 'plan_claim_required') {
    const base = stepNa?.action
      ? stepNa
      : {
          action: 'agents.plan_claim',
          params: {
            ...(projectId != null ? { project_id: projectId } : {}),
            ...(nodeId ? { node_id: nodeId } : {}),
            ...(ctx?.agentId ? { agent_id: ctx.agentId } : {}),
          },
        };
    return parseWorkNextPacket({
      state: 'actionable',
      next_action: applyWorkGraphErrorContext(base, ctx),
    });
  }
  if (code === 'plan_completion_blocked') {
    if (stepNa?.action && stepNa.action !== 'agents.plan_execute') {
      return parseWorkNextPacket({
        state: 'blocked',
        next_action: applyWorkGraphErrorContext(stepNa, ctx),
      });
    }
    return parseWorkNextPacket({
      state: 'blocked',
      ...(nodeId ? { node_id: nodeId } : {}),
      reason: 'plan_completion_blocked',
    });
  }
  if (code === 'role_mismatch' || code === 'specialization_mismatch') {
    if (stepNa?.action) {
      return parseWorkNextPacket({
        state: 'blocked',
        next_action: applyWorkGraphErrorContext(stepNa, ctx),
        reason: code,
        ...(nodeId ? { node_id: nodeId } : {}),
      });
    }
    return parseWorkNextPacket({
      state: 'blocked',
      reason: code,
      ...(nodeId ? { node_id: nodeId } : {}),
      next_action: applyWorkGraphErrorContext(
        {
          action: 'agents.work_next',
          params: {
            ...(projectId != null ? { project_id: projectId } : {}),
            ...(nodeId ? { node_id: nodeId } : {}),
            handoff: true,
          },
        },
        ctx,
      ),
    });
  }
  if (
    code === 'capability_mismatch' ||
    code === 'missing_capability' ||
    code === 'no_compatible_agent' ||
    code === 'provision_required'
  ) {
    if (stepNa?.action) {
      return parseWorkNextPacket({
        state: 'blocked',
        next_action: applyWorkGraphErrorContext(stepNa, ctx),
        reason: code,
        ...(nodeId ? { node_id: nodeId } : {}),
      });
    }
    return parseWorkNextPacket({
      state: 'blocked',
      reason: code,
      ...(nodeId ? { node_id: nodeId } : {}),
      next_action: applyWorkGraphErrorContext(
        {
          action: 'agents.ensure_agent',
          params: {
            ...(projectId != null ? { project_id: projectId } : {}),
            ...(nodeId ? { node_id: nodeId } : {}),
            create: false,
          },
        },
        ctx,
      ),
    });
  }
  if (code === 'run_failed') {
    if (stepNa?.action) {
      return parseWorkNextPacket({
        state: 'blocked',
        next_action: applyWorkGraphErrorContext(stepNa, ctx),
        reason: 'run_failed',
        ...(nodeId ? { node_id: nodeId } : {}),
      });
    }
    return parseWorkNextPacket({
      state: 'blocked',
      reason: 'run_failed',
      ...(nodeId ? { node_id: nodeId } : {}),
      next_action: applyWorkGraphErrorContext(
        {
          action: 'agents.work_next',
          params: {
            ...(projectId != null ? { project_id: projectId } : {}),
            ...(nodeId ? { node_id: nodeId } : {}),
          },
        },
        ctx,
      ),
    });
  }
  if (code === 'expired_claim') {
    return parseWorkNextPacket({
      state: 'blocked',
      reason: code,
      ...(nodeId ? { node_id: nodeId } : {}),
      next_action: applyWorkGraphErrorContext(
        {
          action: 'agents.plan_reclaim_stale',
          params: { ...(projectId != null ? { project_id: projectId } : {}) },
        },
        ctx,
      ),
    });
  }
  if (code === 'wip_full') {
    const planGetParams: Record<string, unknown> = {
      ...(projectId != null ? { project_id: projectId } : {}),
      ...(nodeId ? { node_id: nodeId } : {}),
      detail: 'compact',
      max_depth: 0,
      include: ['prompt'],
      limit: 1,
    };
    const reclaimParams: Record<string, unknown> = {
      ...(projectId != null ? { project_id: projectId } : {}),
    };
    return parseWorkNextPacket({
      state: 'blocked',
      reason: code,
      ...(nodeId ? { node_id: nodeId } : {}),
      next_action: applyWorkGraphErrorContext(
        { action: 'agents.plan_get', params: planGetParams },
        ctx,
      ),
      next_actions: [
        applyWorkGraphErrorContext(
          { action: 'agents.plan_reclaim_stale', params: reclaimParams },
          ctx,
        ),
        applyWorkGraphErrorContext({ action: 'agents.plan_get', params: planGetParams }, ctx),
      ],
    });
  }
  if (code === 'not_executable') {
    return parseWorkNextPacket({
      state: 'blocked',
      reason: code,
      ...(nodeId ? { node_id: nodeId } : {}),
      next_action: applyWorkGraphErrorContext(
        {
          action: 'agents.work_next',
          params: {
            ...(projectId != null ? { project_id: projectId } : {}),
            ...(nodeId ? { node_id: nodeId } : {}),
            detail: 'compact',
          },
        },
        ctx,
      ),
    });
  }
  if (code === 'node_not_found') {
    return parseWorkNextPacket({
      state: 'blocked',
      reason: code,
      ...(nodeId ? { node_id: nodeId } : {}),
      next_action: applyWorkGraphErrorContext(
        {
          action: 'agents.plan_get',
          params: {
            ...(projectId != null ? { project_id: projectId } : {}),
            include_claimable: true,
            detail: 'compact',
          },
        },
        ctx,
      ),
    });
  }
  if (code === 'graph_home_unknown') {
    return parseWorkNextPacket({
      state: 'blocked',
      reason: code,
      next_action: applyWorkGraphErrorContext(
        {
          action: 'agents.plan_get',
          params: {
            ...(projectId != null ? { project_id: projectId } : {}),
            home: 'project',
            detail: 'compact',
          },
        },
        ctx,
      ),
    });
  }
  if (code === 'verification_failed') {
    return parseWorkNextPacket({
      state: 'blocked',
      reason: code,
      next_action: applyWorkGraphErrorContext(
        {
          action: 'agents.plan_recovery_scan',
          params: { ...(projectId != null ? { project_id: projectId } : {}) },
        },
        ctx,
      ),
    });
  }
  if (code === 'validation_error' || code === 'missing_required_dependency') {
    return parseWorkNextPacket({
      state: 'blocked',
      reason: code,
      ...(nodeId ? { node_id: nodeId } : {}),
      next_action: applyWorkGraphErrorContext(
        {
          action: 'agents.plan_propose',
          params: {
            ...(projectId != null ? { project_id: projectId } : {}),
            ...(nodeId ? { node_id: nodeId } : {}),
            mode: 'repair_plan',
          },
        },
        ctx,
      ),
    });
  }
  if (code === 'unknown_skill_id') {
    return parseWorkNextPacket({
      state: 'blocked',
      reason: code,
      next_action: applyWorkGraphErrorContext(
        {
          action: 'agents.skills_list',
          params: { ...(projectId != null ? { project_id: projectId } : {}) },
        },
        ctx,
      ),
    });
  }
  if (code === 'generation_fork_required') {
    return parseWorkNextPacket({
      state: 'blocked',
      reason: code,
      next_action: applyWorkGraphErrorContext(
        {
          action: 'generation.fork',
          params: { ...(projectId != null ? { project_id: projectId } : {}) },
        },
        ctx,
      ),
    });
  }
  if (code === 'pin_slot_not_found') {
    return parseWorkNextPacket({
      state: 'blocked',
      reason: code,
      ...(nodeId ? { node_id: nodeId } : {}),
      next_action: applyWorkGraphErrorContext(
        {
          action: 'agents.plan_get',
          params: {
            ...(projectId != null ? { project_id: projectId } : {}),
            detail: 'compact',
          },
        },
        ctx,
      ),
    });
  }
  if (code === 'claim_heartbeat_failed') {
    return parseWorkNextPacket({
      state: 'blocked',
      reason: code,
      ...(nodeId ? { node_id: nodeId } : {}),
      next_action: applyWorkGraphErrorContext(
        {
          action: 'agents.plan_claim',
          params: {
            ...(projectId != null ? { project_id: projectId } : {}),
            ...(nodeId ? { node_id: nodeId } : {}),
          },
        },
        ctx,
      ),
    });
  }
  if (code === 'pin_inventory_full') {
    return parseWorkNextPacket({
      state: 'blocked',
      reason: code,
      ...(nodeId ? { node_id: nodeId } : {}),
      next_action: applyWorkGraphErrorContext(
        {
          action: 'agents.plan_get',
          params: {
            ...(projectId != null ? { project_id: projectId } : {}),
            detail: 'compact',
          },
        },
        ctx,
      ),
    });
  }
  if (code === 'env_uuid_project_only') {
    const base = stepNa?.params && typeof stepNa.params === 'object'
      ? { ...stepNa.params }
      : {};
    delete (base as Record<string, unknown>).env_uuid;
    return parseWorkNextPacket({
      state: 'blocked',
      reason: code,
      next_action: applyWorkGraphErrorContext(
        {
          action: stepNa?.action || 'agents.plan_execute',
          params: {
            ...base,
            ...(projectId != null ? { project_id: projectId } : {}),
            home: 'project',
          },
        },
        ctx,
      ),
    });
  }
  if (code === 'plan_revision_conflict') {
    const rec = recoveryNextActionFromBody(data);
    if (rec) {
      return parseWorkNextPacket({
        state: 'blocked',
        reason: code,
        next_action: applyWorkGraphErrorContext(rec, ctx),
      });
    }
    return parseWorkNextPacket({
      state: 'blocked',
      reason: code,
      next_action: applyWorkGraphErrorContext(
        {
          action: 'agents.plan_get',
          params: {
            ...(projectId != null ? { project_id: projectId } : {}),
            detail: 'compact',
          },
        },
        ctx,
      ),
    });
  }
  if (
    code === 'storage_content_conflict' ||
    code === 'replacement_not_found' ||
    code === 'upload_failed'
  ) {
    const fileId = String(params.file_id ?? data.file_id ?? '').trim();
    if (!nodeId) return null;
    const base =
      stepNa?.action && String(stepNa.action).startsWith('agents.graph_file_')
        ? stepNa
        : {
            action: 'agents.graph_file_get',
            params: {
              ...(projectId != null ? { project_id: projectId } : {}),
              node_id: nodeId,
              ...(fileId ? { file_id: fileId } : {}),
            },
          };
    return parseWorkNextPacket({
      state: 'blocked',
      reason: code,
      node_id: nodeId,
      next_action: applyWorkGraphErrorContext(base, ctx),
    });
  }
  return null;
}

/** @returns Parsed packet or null when the error has no routable work-graph handoff. */
/** Map fleet/MCP errors to a work_next packet when possible; otherwise rethrow. */
function returnWorkGraphPacketOrThrow(
  err: unknown,
  ctx: WorkGraphErrorToPacketContext,
): WorkNextPacket {
  const packet = workGraphErrorToPacket(err, ctx);
  if (packet) return packet;
  throw err;
}

function workGraphErrorContext(
  projectId: number,
  params: Record<string, unknown>,
  resolvedEnv: string,
  envUuid?: string,
  actionHome?: ReturnType<typeof parseGraphHomeParam>,
  goalId?: string,
): WorkGraphErrorToPacketContext {
  const scopedGoal = explicitGoalId(goalId);
  return {
    projectId,
    envUuid: resolvedEnv || envUuid,
    home: actionHome,
    nodeId: String(params.node_id ?? ''),
    agentId: params.agent_id ? String(params.agent_id) : undefined,
    ...(scopedGoal ? { goalId: scopedGoal } : {}),
  };
}

export function workGraphErrorToPacket(
  err: unknown,
  ctx?: WorkGraphErrorToPacketContext,
): WorkNextPacket | null {
  const data = workGraphErrorBody(err);
  if (!data || typeof data !== 'object') {
    const codeOnly = String((err as { error_code?: string }).error_code ?? '').trim();
    if (codeOnly) {
      try {
        return syntheticWorkGraphPacketFromCode(codeOnly, {}, ctx);
      } catch {
        return null;
      }
    }
    return null;
  }

  const code = String(
    (err as { error_code?: string }).error_code ??
      (data.code as string | undefined) ??
      (data.error_code as string | undefined) ??
      (data.error as string | undefined) ??
      '',
  ).trim();

  const nextAction =
    recoveryNextActionFromBody(data) ?? recoveryFromWorkflowDiagnostics(data, ctx);
  if (nextAction) {
    const state =
      typeof data.state === 'string' && data.state.trim()
        ? data.state
        : code === 'waiting_for_approval'
          ? 'waiting'
          : code === 'plan_claim_required'
            ? 'actionable'
            : 'blocked';
    const patchRecovery: Record<string, unknown> = {};
    if (Array.isArray(data.suggested_archive_ids)) {
      patchRecovery.suggested_archive_ids = data.suggested_archive_ids;
    }
    if (data.ops_compact && typeof data.ops_compact === 'object') {
      patchRecovery.ops_compact = data.ops_compact;
    }
    if (data.preflight_read && typeof data.preflight_read === 'object') {
      patchRecovery.preflight_read = data.preflight_read;
    }
    const preflightSteps = workGraphPreflightStepsFromBody(data);
    if (preflightSteps.length > 0) {
      patchRecovery.preflight_step = preflightSteps[0];
    }
    const recObj =
      data.recovery && typeof data.recovery === 'object' && !Array.isArray(data.recovery)
        ? (data.recovery as Record<string, unknown>)
        : undefined;
    const recNa = recObj?.next_action;
    if (recNa && typeof recNa === 'object') {
      const ex = (recNa as { example_ops?: unknown }).example_ops;
      if (Array.isArray(ex)) patchRecovery.example_ops = ex;
    }
    const baseDiag =
      data.diagnostics && typeof data.diagnostics === 'object'
        ? { ...(data.diagnostics as Record<string, unknown>) }
        : {};
    const diagnostics =
      Object.keys(patchRecovery).length > 0
        ? { ...baseDiag, plan_patch_recovery: patchRecovery }
        : baseDiag;
    const instructionHint =
      typeof data.instruction_hint === 'string' ? data.instruction_hint.trim() : '';
    const recReason =
      recNa && typeof recNa === 'object'
        ? String((recNa as { reason?: string }).reason ?? '').trim()
        : '';
    try {
      return parseWorkNextPacket({
        ...data,
        state,
        ...(code ? { blocked_reason_code: code } : {}),
        ...(instructionHint || recReason ? { reason: instructionHint || recReason } : {}),
        ...(Object.keys(diagnostics).length ? { diagnostics } : {}),
        next_action: applyWorkGraphErrorContext(nextAction, ctx),
      });
    } catch {
      return null;
    }
  }

  if (code) {
    try {
      return syntheticWorkGraphPacketFromCode(code, data, ctx);
    } catch {
      return null;
    }
  }
  return null;
}

export function parsePlanGraph(raw: unknown): PlanGraph {
  if (!raw || typeof raw !== 'object') return { tasks: [] };
  const row = raw as Record<string, unknown>;
  return {
    version: typeof row.version === 'number' ? row.version : undefined,
    revision: typeof row.revision === 'number' ? row.revision : undefined,
    root_prompt: typeof row.root_prompt === 'string' ? row.root_prompt : undefined,
    active_goal_id:
      typeof row.active_goal_id === 'string' ? row.active_goal_id : null,
    tasks: Array.isArray(row.tasks) ? (row.tasks as PlanNode[]) : [],
  };
}

export type GraphViewerNode = PlanNode & {
  isFocus?: boolean;
  leaseSecondsRemaining?: number;
  parallelLaneIndex?: number;
  /** Direct-child completion rollup for parent nodes (0–100). */
  childCompletionPercent?: number;
};

/** Mirrors ``contract_to_packet_dict`` semantic projection (instruction / discovery). */
export type GoalSemanticContractPacket = {
  required_facets?: string[];
  optional_facets?: string[];
  forbidden_facets?: string[];
  explicit_exclusions?: string[];
  effect_constraints?: string[];
  implementation_constraints?: Array<Record<string, unknown>>;
  goal_constraints?: Array<Record<string, unknown>>;
  platform_mappings?: Record<string, unknown>;
  execution_preferences?: Record<string, unknown>;
  dependencies?: Array<Record<string, unknown>>;
  primary_intent?: string;
  archetype_id?: string;
  fingerprint?: string;
  custom_code_required?: boolean;
  facet_status?: Record<string, unknown>;
  locale?: string;
  raw_goal?: string;
  plan_policy?: Record<string, boolean>;
  execution_policy?: Record<string, boolean>;
  required_facets_public?: string[];
  temporal_mode?: string;
  covered_domains?: string[];
  unprojected_domains?: string[];
  forbidden_concepts?: string[];
  evidence?: Array<Record<string, unknown>>;
  semantic_debug?: Record<string, unknown>;
  clarification_needed?: boolean;
  implementation_mode?: string;
};

/** Parse discovery / instruction ``semantic_contract`` blobs (lossy-safe). */
export function parseGoalSemanticContractPacket(
  raw: unknown,
): GoalSemanticContractPacket | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  return {
    required_facets: Array.isArray(row.required_facets)
      ? row.required_facets.map(String)
      : undefined,
    optional_facets: Array.isArray(row.optional_facets)
      ? row.optional_facets.map(String)
      : undefined,
    forbidden_facets: Array.isArray(row.forbidden_facets)
      ? row.forbidden_facets.map(String)
      : undefined,
    explicit_exclusions: Array.isArray(row.explicit_exclusions)
      ? row.explicit_exclusions.map(String)
      : undefined,
    effect_constraints: Array.isArray(row.effect_constraints)
      ? row.effect_constraints.map(String)
      : undefined,
    implementation_constraints: Array.isArray(row.implementation_constraints)
      ? (row.implementation_constraints as Array<Record<string, unknown>>)
      : undefined,
    goal_constraints: Array.isArray(row.goal_constraints)
      ? (row.goal_constraints as Array<Record<string, unknown>>)
      : undefined,
    platform_mappings:
      row.platform_mappings && typeof row.platform_mappings === 'object'
        ? (row.platform_mappings as Record<string, unknown>)
        : undefined,
    execution_preferences:
      row.execution_preferences && typeof row.execution_preferences === 'object'
        ? (row.execution_preferences as Record<string, unknown>)
        : undefined,
    dependencies: Array.isArray(row.dependencies)
      ? (row.dependencies as Array<Record<string, unknown>>)
      : undefined,
    primary_intent: typeof row.primary_intent === 'string' ? row.primary_intent : undefined,
    archetype_id: typeof row.archetype_id === 'string' ? row.archetype_id : undefined,
    fingerprint: typeof row.fingerprint === 'string' ? row.fingerprint : undefined,
    custom_code_required:
      typeof row.custom_code_required === 'boolean' ? row.custom_code_required : undefined,
    facet_status:
      row.facet_status && typeof row.facet_status === 'object'
        ? (row.facet_status as Record<string, unknown>)
        : undefined,
    locale: typeof row.locale === 'string' ? row.locale : undefined,
    raw_goal: typeof row.raw_goal === 'string' ? row.raw_goal : undefined,
    plan_policy:
      row.plan_policy && typeof row.plan_policy === 'object'
        ? (row.plan_policy as Record<string, boolean>)
        : undefined,
    execution_policy:
      row.execution_policy && typeof row.execution_policy === 'object'
        ? (row.execution_policy as Record<string, boolean>)
        : undefined,
    temporal_mode: typeof row.temporal_mode === 'string' ? row.temporal_mode : undefined,
    covered_domains: Array.isArray(row.covered_domains)
      ? row.covered_domains.map(String)
      : undefined,
    unprojected_domains: Array.isArray(row.unprojected_domains)
      ? row.unprojected_domains.map(String)
      : undefined,
    required_facets_public: Array.isArray(row.required_facets_public)
      ? row.required_facets_public.map(String)
      : undefined,
    forbidden_concepts: Array.isArray(row.forbidden_concepts)
      ? row.forbidden_concepts.map(String)
      : undefined,
    evidence: Array.isArray(row.evidence)
      ? (row.evidence as Array<Record<string, unknown>>)
      : undefined,
    semantic_debug:
      row.semantic_debug && typeof row.semantic_debug === 'object'
        ? (row.semantic_debug as Record<string, unknown>)
        : undefined,
    clarification_needed:
      typeof row.clarification_needed === 'boolean' ? row.clarification_needed : undefined,
    implementation_mode:
      typeof row.implementation_mode === 'string' ? row.implementation_mode : undefined,
  };
}

/** Labels for copilot / graph badges from effect_constraints on a semantic contract. */
export function semanticPlanPolicyLabels(
  contract: GoalSemanticContractPacket | null | undefined,
): string[] {
  const effects = contract?.effect_constraints ?? [];
  const out: string[] = [];
  if (effects.includes('read_only')) out.push('read_only');
  if (effects.includes('plan_only')) out.push('plan_only');
  if (effects.includes('approval_required')) out.push('approval_required');
  return out;
}

export type GraphViewerModel = {
  nodes: GraphViewerNode[];
  metrics: Record<string, unknown>;
  state?: WorkNextState;
  /** Sibling plan node ids that may run in parallel (``parallelizable`` + shared parent). */
  parallelLanes?: string[][];
};

/** Group parallelizable siblings under the same parent. */
function parallelLaneIndexByNode(tasks: PlanNode[] | undefined): Map<string, number> {
  const map = new Map<string, number>();
  if (!tasks?.length) return map;
  const deps = new Map<string, string[]>();
  for (const node of tasks) {
    const id = String(node.id);
    const raw = node.dependencies ?? [];
    deps.set(id, raw.map(String).filter(Boolean));
  }
  const inDeg = new Map<string, number>();
  const rev = new Map<string, string[]>();
  for (const [nid, req] of deps) {
    inDeg.set(nid, req.length);
    for (const d of req) {
      const bucket = rev.get(d) ?? [];
      bucket.push(nid);
      rev.set(d, bucket);
    }
  }
  let layer = 0;
  let current = [...inDeg.entries()].filter(([, deg]) => deg === 0).map(([id]) => id);
  while (current.length) {
    for (const nid of current) {
      map.set(nid, layer);
    }
    const nxt: string[] = [];
    for (const nid of current) {
      for (const child of rev.get(nid) ?? []) {
        const deg = (inDeg.get(child) ?? 0) - 1;
        inDeg.set(child, deg);
        if (deg === 0) nxt.push(child);
      }
    }
    current = nxt;
    layer += 1;
  }
  return map;
}

function flattenPlanNodes(tasks: PlanNode[] | undefined): PlanNode[] {
  const out: PlanNode[] = [];
  const walk = (nodes: PlanNode[] | undefined) => {
    for (const node of nodes ?? []) {
      out.push(node);
      if (Array.isArray(node.children) && node.children.length) walk(node.children);
    }
  };
  walk(tasks);
  return out;
}

export function parallelSiblingLanes(tasks: PlanNode[] | undefined): string[][] {
  const flat = flattenPlanNodes(tasks);
  if (!flat.length) return [];
  const byParent = new Map<string, PlanNode[]>();
  for (const node of flat) {
    const parent = String(node.parent_id ?? '__root__');
    const bucket = byParent.get(parent) ?? [];
    bucket.push(node);
    byParent.set(parent, bucket);
  }
  const lanes: string[][] = [];
  for (const siblings of byParent.values()) {
    const parallel = siblings.filter((n) => n.parallelizable === true);
    if (parallel.length >= 2) {
      lanes.push(parallel.map((n) => String(n.id)));
    }
  }
  return lanes;
}

function directChildCompletionByParent(tasks: PlanNode[]): Map<string, number> {
  const byParent = new Map<string, PlanNode[]>();
  for (const node of flattenPlanNodes(tasks)) {
    const parent = String(node.parent_id ?? '').trim();
    if (!parent) continue;
    const bucket = byParent.get(parent) ?? [];
    bucket.push(node);
    byParent.set(parent, bucket);
  }
  const out = new Map<string, number>();
  for (const [parentId, children] of byParent) {
    const total = children.length;
    if (total < 1) continue;
    const done = children.filter((c) => String(c.status ?? '') === 'completed').length;
    out.set(parentId, Math.round((100 * done) / total));
  }
  return out;
}

/** Shared DTO for human viewer + external agents (WG-4). */
export function buildGraphViewerModel(
  plan: PlanGraph,
  workNext?: WorkNextPacket | null,
  focusNodeId?: string,
): GraphViewerModel {
  const focus = focusNodeId ?? workNext?.next_work?.node_id;
  const tasks = plan.tasks ?? [];
  const parsedPacket = workNext ? parseWorkNextPacket(workNext) : null;
  const compactViewer = parsedPacket?.detail === 'compact';
  const laneIndex = compactViewer
    ? new Map<string, number>()
    : parallelLaneIndexByNode(tasks);
  const childRollup = directChildCompletionByParent(tasks);
  const nodes: GraphViewerNode[] = tasks.map((node) => {
    const id = String(node.id);
    const childCompletionPercent = childRollup.get(id);
    return {
      ...node,
      isFocus: focus ? id === String(focus) : false,
      parallelLaneIndex: laneIndex.get(id),
      ...(childCompletionPercent != null ? { childCompletionPercent } : {}),
    };
  });
  const lifecycle = parsedPacket?.state;
  return {
    nodes,
    metrics: graphViewerMetrics(workNext),
    state: lifecycle,
    ...(compactViewer ? {} : { parallelLanes: parallelSiblingLanes(tasks) }),
  };
}

/** REST ``POST .../orchestrator/run`` + MCP execute handoff on one parse spine. */
export type OrchestrateRunResponse = {
  success: boolean;
  run: Record<string, unknown>;
  execute?: PlanExecuteResult;
};

export function parseOrchestrateRunResponse(
  raw: unknown,
  opts?: { focusNodeId?: string },
): OrchestrateRunResponse {
  const env = normalizeMcpToolEnvelope(raw);
  const base = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const row: Record<string, unknown> = { ...base, ...env.data };
  const run =
    row.run && typeof row.run === 'object'
      ? (row.run as Record<string, unknown>)
      : {};
  const success = env.success && row.success !== false;
  const focus = String(opts?.focusNodeId ?? '').trim();
  if (!focus) {
    return { success, run };
  }
  const execute = parsePlanExecuteResult(raw, { focusNodeId: focus });
  return { success, run, execute };
}

export { MCP_WORK_GRAPH_HOIST_KEYS, normalizeMcpWorkGraphPayload } from '../mcp/workGraphHoist';

/** MCP execute / agents.run envelope — ``success`` follows ``run_succeeded`` when set. */
export function normalizeMcpToolEnvelope(raw: unknown): {
  success: boolean;
  data: Record<string, unknown>;
} {
  const row = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  let data =
    row.data && typeof row.data === 'object' ? ({ ...(row.data as Record<string, unknown>) } as Record<string, unknown>) : {};
  for (const key of MCP_WORK_GRAPH_HOIST_KEYS) {
    if (row[key] !== undefined && data[key] === undefined) {
      data[key] = row[key];
    }
  }
  const structured = row.structuredContent;
  if (structured && typeof structured === 'object') {
    const scData = (structured as Record<string, unknown>).data;
    if (scData && typeof scData === 'object') {
      const nested = scData as Record<string, unknown>;
      data = { ...data, ...nested };
      if (!Array.isArray(data.steps) && Array.isArray(nested.steps)) {
        data.steps = nested.steps;
      }
    }
  }
  let success = row.success === true;
  const runSucceeded =
    typeof row.run_succeeded === 'boolean'
      ? row.run_succeeded
      : typeof data.run_succeeded === 'boolean'
        ? (data.run_succeeded as boolean)
        : undefined;
  if (typeof runSucceeded === 'boolean') {
    success = runSucceeded;
  }
  data = normalizeMcpWorkGraphPayload(data);
  return { success, data };
}

function graphViewerMetrics(workNext?: WorkNextPacket | null): Record<string, unknown> {
  const plan = (workNext?.plan_summary as Record<string, unknown>) ?? {};
  const goal = workNext?.goal_summary;
  const weighted = goal?.goal_progress?.weighted_completion_percent;
  const diagBottleneck = workNext?.diagnostics?.bottleneck;
  const goalBottleneck = goal?.current_bottleneck;
  const bottleneck =
    diagBottleneck && typeof diagBottleneck === 'object'
      ? diagBottleneck
      : goalBottleneck && typeof goalBottleneck === 'object'
        ? goalBottleneck
        : undefined;
  const timings = workNext?.diagnostics?.timings_ms;
  const budget = workNext?.diagnostics?.execute_budget;
  return {
    ...plan,
    ...(bottleneck ? { bottleneck } : {}),
    ...(typeof weighted === 'number' ? { weighted_completion_percent: weighted } : {}),
    ...(timings && typeof timings === 'object' ? { timings_ms: timings } : {}),
    ...(budget && typeof budget === 'object' ? { execute_budget: budget } : {}),
    ...(workNext?.agent_os ? { agent_os: workNext.agent_os } : {}),
  };
}

type WorkGraphFleetLike = {
  workNext(projectId: number, body?: Record<string, unknown>): Promise<WorkNextPacket>;
  workStatus(projectId: number, body?: Record<string, unknown>): Promise<WorkNextPacket>;
  claimPlanNodes(
    projectId: number,
    body: {
      agent_id: string;
      limit?: number;
      node_ids?: string[];
      if_match_revision?: number;
      env_uuid?: string;
      home?: 'project' | 'self' | 'project_self';
      heartbeat_only?: boolean;
      node_id?: string;
      pin_skill_id?: string;
      unpin_skill_id?: string;
      collapse_skill_id?: string;
      expand_skill_id?: string;
      slot_mode?: string;
    },
  ): Promise<Record<string, unknown>>;
  planExecute(
    projectId: number,
    body: {
      node_id: string;
      agent_id?: string;
      goal_text?: string;
      mode?: string;
      env_uuid?: string;
      home?: 'project' | 'self' | 'project_self' | string;
    },
  ): Promise<Record<string, unknown>>;
  ensureAgent(
    projectId: number,
    body: { node_id: string; create?: boolean; name?: string; env_uuid?: string },
  ): Promise<Record<string, unknown>>;
  planRecoveryScan(
    projectId: number,
    body?: Record<string, unknown>,
  ): Promise<Record<string, unknown>>;
  planPropose?(
    projectId: number,
    body?: Record<string, unknown>,
  ): Promise<Record<string, unknown>>;
  planApplyProposal?(
    projectId: number,
    body: Record<string, unknown>,
  ): Promise<Record<string, unknown>>;
  reclaimStalePlanClaims?(
    projectId: number,
    body?: Record<string, unknown>,
  ): Promise<Record<string, unknown>>;
  planCompactionPreviewMcp?(
    projectId: number,
    body?: Record<string, unknown>,
  ): Promise<Record<string, unknown>>;
  planHealLeafMcp?(
    projectId: number,
    body?: Record<string, unknown>,
  ): Promise<Record<string, unknown>>;
  createFromTemplate?(
    projectId: number,
    body: Record<string, unknown>,
  ): Promise<Record<string, unknown>>;
  planGet?(
    projectId: number,
    options?: Record<string, unknown>,
  ): Promise<Record<string, unknown>>;
  teamCreate?(
    projectId: number,
    body: Record<string, unknown>,
  ): Promise<Record<string, unknown>>;
  processPlanBacklog?(
    projectId: number,
    body?: Record<string, unknown>,
  ): Promise<Record<string, unknown>>;
  planPatchMcp?(
    projectId: number,
    body: Record<string, unknown>,
  ): Promise<Record<string, unknown>>;
  planProposeMcp?(
    projectId: number,
    body: Record<string, unknown>,
  ): Promise<Record<string, unknown>>;
  planApplyProposalMcp?(
    projectId: number,
    body: Record<string, unknown>,
  ): Promise<Record<string, unknown>>;
  patchPlan?(
    projectId: number,
    body: {
      patch: Record<string, unknown>;
      replace?: boolean;
      if_match_revision?: number;
      env_uuid?: string;
    },
  ): Promise<{ success: boolean; task_list?: Record<string, unknown> }>;
  patchPlanOps?(
    projectId: number,
    body: PlanOpsRequestBody,
  ): Promise<Record<string, unknown>>;
  graphFilePut?(
    projectId: number,
    body: Record<string, unknown>,
  ): Promise<Record<string, unknown>>;
  graphFileGet?(
    projectId: number,
    body: Record<string, unknown>,
  ): Promise<Record<string, unknown>>;
  graphFileEdit?(
    projectId: number,
    body: Record<string, unknown>,
  ): Promise<Record<string, unknown>>;
  graphFileList?(
    projectId: number,
    body: Record<string, unknown>,
  ): Promise<Record<string, unknown>>;
  /** Optional raw MCP dispatch for recovery actions not wrapped yet. */
  mcpAction?(
    action: string,
    params?: Record<string, unknown>,
  ): Promise<Record<string, unknown>>;
};

/** Sparse ``agents.plan_patch``. ``patchPlan`` stays the full-tree writer. */
export async function patchPlanArchiveIds(
  fleet: WorkGraphFleetLike,
  projectId: number,
  archiveIds: string[],
  revision: number,
  home: 'project' | 'self' | 'project_self' = 'project',
): Promise<Record<string, unknown>> {
  return patchPlanMutate(
    fleet,
    projectId,
    { archive_ids: archiveIds },
    revision,
    home,
  );
}

async function patchPlanMutate(
  fleet: WorkGraphFleetLike,
  projectId: number,
  body: { ops?: Array<Record<string, unknown>>; archive_ids?: string[] },
  revision: number,
  home: 'project' | 'self' | 'project_self' = 'project',
): Promise<Record<string, unknown>> {
  if (!fleet.patchPlanOps) {
    throw new Error('patchPlanOps unavailable');
  }
  let rev = revision;
  const maxAttempts = 3;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fleet.patchPlanOps(projectId, {
        ...body,
        if_match_revision: rev,
        ...mcpGraphHomeFields(home),
      });
    } catch (err) {
      if (isPlanArchiveNoEffect(err)) {
        throw err;
      }
      if (!isPlanRevisionConflict(err) || attempt >= maxAttempts - 1) {
        throw err;
      }
      if (fleet.planGet) {
        const snap = await fleet.planGet(projectId, {
          detail: 'compact',
          ...mcpGraphHomeFields(home),
        });
        const nested = (snap as { data?: Record<string, unknown> }).data ?? snap;
        const nextRev = Number(
          (nested as { revision?: number }).revision ??
            (nested as { data?: { revision?: number } }).data?.revision,
        );
        if (Number.isFinite(nextRev) && nextRev > 0) {
          rev = nextRev;
        }
      }
    }
  }
  throw new Error('patchPlanOps CAS retry exhausted');
}

export async function patchPlanOps(
  fleet: WorkGraphFleetLike,
  projectId: number,
  ops: Array<Record<string, unknown>>,
  revision: number,
  home: 'project' | 'self' | 'project_self' = 'project',
): Promise<Record<string, unknown>> {
  return patchPlanMutate(fleet, projectId, { ops }, revision, home);
}

function unwrapEnsureAgentRow(raw: Record<string, unknown>): Record<string, unknown> {
  const nested = raw.data;
  if (nested && typeof nested === 'object') return nested as Record<string, unknown>;
  return raw;
}

function previewNeedsProvisionCommit(row: Record<string, unknown>): boolean {
  if (row.provision_required === true) return true;
  return String(row.blocked_reason ?? '').trim() === 'provision_required';
}

/** Work-graph home segment for MCP/REST (`core.agents.work_graph.gen1`). */
export type GraphHomeParam = 'project' | 'project_self' | 'self';

export function parseGraphHomeParam(
  raw?: string | null,
): 'project' | 'project_self' {
  const h = String(raw ?? '').trim();
  if (h === 'self' || h === 'project_self') return 'project_self';
  return 'project';
}

export type ParsedMembershipConfig = {
  joinPolicy?: string;
  openJoin?: boolean;
  defaultHome?: 'project' | 'project_self';
};

/** BFF summary / get_project membership + work_graph hints. */
export function parseMembershipConfig(project: unknown): ParsedMembershipConfig {
  if (!project || typeof project !== 'object') return {};
  const row = project as Record<string, unknown>;
  const membership =
    row.membership && typeof row.membership === 'object'
      ? (row.membership as Record<string, unknown>)
      : undefined;
  const joinPolicy =
    typeof membership?.join_policy === 'string' ? membership.join_policy : undefined;
  const openJoin =
    membership?.open_join === true ||
    (joinPolicy != null && joinPolicy.toLowerCase() === 'open')
      ? true
      : undefined;
  const defaultHome = defaultWorkGraphHome(project);
  return {
    joinPolicy,
    openJoin,
    defaultHome: defaultHome === 'project_self' ? 'project_self' : 'project',
  };
}

/** Resolve default work-graph home from project DNA config leaves. */
export function defaultWorkGraphHome(projectConfig: unknown): 'project' | 'project_self' {
  if (!projectConfig || typeof projectConfig !== 'object') return 'project';
  const row = projectConfig as Record<string, unknown>;
  const nested =
    row.config && typeof row.config === 'object'
      ? (row.config as Record<string, unknown>)
      : undefined;
  const wg =
    (row.work_graph && typeof row.work_graph === 'object'
      ? row.work_graph
      : nested?.work_graph) as Record<string, unknown> | undefined;
  const home = wg?.default_home;
  return parseGraphHomeParam(typeof home === 'string' ? home : null);
}

/** H5 ensure saga — preview before create=true. */
export function isPersonalGraphHome(home?: string): boolean {
  return parseGraphHomeParam(home) === 'project_self';
}

/** MCP `home` field — canonical `project_self` only (API still accepts `self`). */
export function mcpGraphHomeFields(
  home?: GraphHomeParam,
): { home?: 'project_self' } {
  const graphHome = parseGraphHomeParam(home);
  return graphHome === 'project' ? {} : { home: graphHome };
}

export function isSandboxEnvAllowedForGraphHome(home?: GraphHomeParam): boolean {
  return !isPersonalGraphHome(home);
}

export async function ensureAgentSaga(
  fleet: WorkGraphFleetLike,
  projectId: number,
  nodeId: string,
  envUuid?: string,
  locale?: string,
  home?: 'project' | 'self' | 'project_self',
): Promise<Record<string, unknown>> {
  const env =
    isPersonalGraphHome(home) ? '' : String(envUuid ?? '').trim();
  const body = {
    node_id: nodeId,
    ...mcpGraphHomeFields(home),
    ...(env ? { env_uuid: env } : {}),
    ...(locale ? { locale } : {}),
  };
  const previewRaw = await fleet.ensureAgent(projectId, { ...body, create: false });
  const preview =
    previewRaw && typeof previewRaw === 'object'
      ? unwrapEnsureAgentRow(previewRaw as Record<string, unknown>)
      : {};
  if (!previewNeedsProvisionCommit(preview)) {
    return previewRaw as Record<string, unknown>;
  }
  const previewTemplateId = String(
    preview.preview_template_id ?? preview.template_id ?? '',
  ).trim();
  const graphRevision = preview.graph_revision;
  return fleet.ensureAgent(projectId, {
    ...body,
    create: true,
    ...(previewTemplateId ? { preview_template_id: previewTemplateId } : {}),
    ...(graphRevision != null && String(graphRevision).trim() !== ''
      ? { graph_revision: graphRevision }
      : {}),
  });
}

function explicitGoalId(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

/** Keep ``goal_id`` on refreshes when the action params omit the loop scope. */
function mergeGoalIdParam(
  params: Record<string, unknown>,
  goalId?: string,
): { params: Record<string, unknown>; goalId?: string } {
  const fromParams = explicitGoalId(params.goal_id);
  const scoped = fromParams ?? explicitGoalId(goalId);
  if (!scoped || fromParams) return { params, goalId: scoped };
  return { params: { ...params, goal_id: scoped }, goalId: scoped };
}

/** REST/MCP param merge — canonical home + sandbox env (`core.agents.work_graph.gen1`). */
export function mergeWorkGraphScopeParams(
  params: Record<string, unknown>,
  opts?: { home?: GraphHomeParam | string; envUuid?: string | null },
): Record<string, unknown> {
  const home = opts?.home;
  const withHome =
    home != null && String(home).trim()
      ? { ...params, ...mcpGraphHomeFields(home as GraphHomeParam) }
      : params;
  return mergeEnvUuidParam(withHome, opts?.envUuid ?? undefined);
}

function mergeEnvUuidParam(
  params: Record<string, unknown>,
  envUuid?: string,
): Record<string, unknown> {
  const rawHome = String(params.home ?? '').trim();
  if (isPersonalGraphHome(rawHome)) {
    const { env_uuid: _omit, ...rest } = params;
    return { ...rest, ...mcpGraphHomeFields(rawHome as GraphHomeParam) };
  }
  const fromParams = typeof params.env_uuid === 'string' ? params.env_uuid.trim() : '';
  const scoped = fromParams || String(envUuid ?? '').trim();
  if (!scoped || fromParams) return params;
  return { ...params, env_uuid: scoped };
}

function pickWorkGraphLocale(params: Record<string, unknown>): string | undefined {
  const tag = String(params.locale ?? params.instruction_locale ?? '').trim();
  return tag || undefined;
}

function refreshWorkNext(
  fleet: WorkGraphFleetLike,
  projectId: number,
  goalId?: string,
  envUuid?: string,
  home?: 'project' | 'self' | 'project_self',
  locale?: string,
): Promise<WorkNextPacket> {
  const gid = explicitGoalId(goalId);
  const graphHome = parseGraphHomeParam(home);
  const env = String(envUuid ?? '').trim();
  const body: Record<string, unknown> = {
    detail: 'full',
    ...mcpGraphHomeFields(home),
  };
  if (gid) body.goal_id = gid;
  if (env && isSandboxEnvAllowedForGraphHome(graphHome)) body.env_uuid = env;
  if (locale) body.locale = locale;
  return fleet.workNext(projectId, body).then((raw) => parseWorkNextPacket(raw));
}

async function executeWorkGraphPreflightRead(
  fleet: WorkGraphFleetLike,
  projectId: number,
  preStep: { action: string; params: Record<string, unknown> } | null | undefined,
  merged: { params: Record<string, unknown>; goalId?: string },
  hooks?: { graphHome?: GraphHomeParam; envUuid?: string },
): Promise<void> {
  if (!preStep) return;
  const action = String(preStep.action ?? '').trim();
  if (action !== 'agents.plan_get') return;
  const scoped = mergeWorkGraphScopeParams(
    mergeGoalIdParam({ ...(preStep.params ?? {}) }, merged.goalId).params,
    { envUuid: hooks?.envUuid, home: hooks?.graphHome },
  );
  if (fleet.planGet) {
    await fleet.planGet(projectId, scoped);
    return;
  }
  if (!fleet.mcpAction) return;
  await fleet.mcpAction(action, { project_id: projectId, ...scoped });
}

/** Dispatch canonical work-graph MCP actions via fleet (DRY with Copilot). */
export async function followWorkGraphAction(
  fleet: WorkGraphFleetLike,
  projectId: number,
  action: { action?: string; params?: Record<string, unknown> },
  goalId?: string,
  envUuid?: string,
  hooks?: {
    graphHome?: GraphHomeParam;
    onPropose?: (result: PlanProposeResult) => void;
    onRecoveryScan?: (scan: Record<string, unknown>) => void;
    /** agents.plan_heal_leaf MCP body (healed, bytes_before, …). */
    onPlanCompactionPreview?: (result: Record<string, unknown>) => void;
    onPlanHealLeaf?: (result: Record<string, unknown>) => void;
    /** plan_patch / plan_apply_proposal / process_backlog body with revision + changed[]. */
    onPlanMutation?: (result: Record<string, unknown>) => void;
    /** agents.graph_file_get payload (file card + text window) for viewer panel cache. */
    onGraphFileResult?: (data: Record<string, unknown>) => void;
    /** Optional plan_get pre-step from PGVE packet (see workGraphPreflightStepFromPacket). */
    preflightStep?: { action: string; params: Record<string, unknown> } | null;
    /** When false, skip preflight read even if preflightStep is set. */
    runPreflightBeforeMutate?: boolean;
  },
): Promise<WorkNextPacket> {
  const emitPlanMutation = (raw: unknown) => {
    if (raw && typeof raw === 'object') {
      hooks?.onPlanMutation?.(raw as Record<string, unknown>);
    }
  };
  const name = String(action.action ?? '').trim();
  const merged = mergeGoalIdParam(
    mergeWorkGraphScopeParams(action.params ?? {}, {
      envUuid,
      home: hooks?.graphHome ?? (action.params?.home as GraphHomeParam | undefined),
    }),
    goalId,
  );
  const params = merged.params;
  const resolvedEnv = typeof params.env_uuid === 'string' ? params.env_uuid.trim() : '';
  const wgLocale = pickWorkGraphLocale(params);
  const rawHome = String(params.home ?? '').trim();
  const actionHome = isPersonalGraphHome(rawHome)
    ? parseGraphHomeParam(rawHome)
    : undefined;
  const refresh = () =>
    refreshWorkNext(
      fleet,
      projectId,
      merged.goalId,
      actionHome ? undefined : resolvedEnv || undefined,
      actionHome,
      wgLocale,
    );
  const wgCtx = () =>
    workGraphErrorContext(
      projectId,
      params,
      resolvedEnv,
      envUuid,
      actionHome,
      merged.goalId,
    );
  switch (name) {
    case 'agents.work_next':
      try {
        return parseWorkNextPacket(
          await fleet.workNext(projectId, {
            ...params,
            ...(params.detail == null ? { detail: 'compact' } : {}),
            ...(wgLocale ? { locale: wgLocale } : {}),
          }),
        );
      } catch (err) {
        return returnWorkGraphPacketOrThrow(err, wgCtx());
      }
    case 'agents.work_status':
      try {
        return parseWorkNextPacket(
          await fleet.workStatus(projectId, {
            ...params,
            ...(params.detail == null ? { detail: 'compact' } : {}),
            ...(wgLocale ? { locale: wgLocale } : {}),
          }),
        );
      } catch (err) {
        return returnWorkGraphPacketOrThrow(err, wgCtx());
      }
    case 'agents.plan_pin':
    case 'generation.fork':
    case 'storage.list_files':
    case 'auth.get_profile':
    case 'crm.list_contacts':
    case 'hosting.project.status':
    case 'logic.dry_run':
    case 'notifications.list_prefs':
    case 'rag.search':
    case 'rbac.check_permission':
    case 'scheduler.list_tasks':
    case 'projects.orchestrator.get':
    case 'bots.list':
    case 'agents.skills_list':
    case 'agents.graph_health':
    case 'diagnostics.consistency.scan':
    case 'agents.reconcile_binding':
    case 'agents.plan_ingest':
    case 'agents.orchestrate':
    case 'agents.run_get':
    case 'agents.approve_run':
    case 'agents.run':
    case 'agents.fleet_diagnostics':
    case 'agents.plan_reconcile_diagnostics':
    case 'agents.plan_suggest_tree':
    case 'agents.traces': {
      if (!fleet.mcpAction) break;
      try {
        await fleet.mcpAction(name, { project_id: projectId, ...params });
      } catch (err) {
        return returnWorkGraphPacketOrThrow(err, wgCtx());
      }
      return refresh();
    }
    case 'agents.plan_claim': {
      try {
        const agentId = String(params.agent_id ?? params.prefer_agent_id ?? 'agent').trim();
        const nodeIds = Array.isArray(params.node_ids)
          ? params.node_ids.map(String)
          : params.node_id
            ? [String(params.node_id)]
            : [];
        const ifMatch = params.if_match_revision;
        const limit = typeof params.limit === 'number' ? params.limit : undefined;
        const claimed = await fleet.claimPlanNodes(projectId, {
          agent_id: agentId,
          ...(nodeIds.length ? { node_ids: nodeIds } : {}),
          ...(params.node_id ? { node_id: String(params.node_id) } : {}),
          ...(limit != null ? { limit } : {}),
          ...(typeof ifMatch === 'number' ? { if_match_revision: ifMatch } : {}),
          ...(actionHome ? { home: actionHome } : {}),
          ...(resolvedEnv && !actionHome ? { env_uuid: resolvedEnv } : {}),
          ...(params.heartbeat_only ? { heartbeat_only: true } : {}),
          ...(params.pin_skill_id ? { pin_skill_id: String(params.pin_skill_id) } : {}),
          ...(params.unpin_skill_id ? { unpin_skill_id: String(params.unpin_skill_id) } : {}),
          ...(params.collapse_skill_id
            ? { collapse_skill_id: String(params.collapse_skill_id) }
            : {}),
          ...(params.expand_skill_id ? { expand_skill_id: String(params.expand_skill_id) } : {}),
          ...(params.slot_mode ? { slot_mode: String(params.slot_mode) } : {}),
        });
        const claimedRow = claimed as {
          next_action?: { action?: string };
          changed?: unknown;
          task_list?: unknown;
        };
        if (claimedRow.changed != null || claimedRow.task_list != null) {
          emitPlanMutation(claimed);
        }
        if (claimedRow.next_action?.action) return parseWorkNextPacket(claimed);
        return refresh();
      } catch (err) {
        return returnWorkGraphPacketOrThrow(err, wgCtx());
      }
    }
    case 'agents.plan_execute': {
      try {
        const executed = await fleet.planExecute(projectId, {
          node_id: String(params.node_id ?? ''),
          agent_id: params.agent_id ? String(params.agent_id) : undefined,
          goal_text: params.goal_text ? String(params.goal_text) : undefined,
          ...(actionHome ? { home: actionHome } : {}),
          ...(resolvedEnv && !actionHome ? { env_uuid: resolvedEnv } : {}),
          ...(wgLocale ? { locale: wgLocale } : {}),
        });
        const parsedExecute = parsePlanExecuteResult(executed, {
          focusNodeId: String(params.node_id ?? ''),
        });
        const next = parsedExecute.next_action;
        if (next?.action) return parseWorkNextPacket(executed);
        if (
          parsedExecute.action_readiness ||
          parsedExecute.work_state ||
          (parsedExecute.next_actions?.length ?? 0) > 0
        ) {
          const base =
            executed && typeof executed === 'object'
              ? (executed as Record<string, unknown>)
              : {};
          return parseWorkNextPacket({
            ...base,
            ...(parsedExecute.work_state ? { work_state: parsedExecute.work_state } : {}),
            ...(parsedExecute.action_readiness
              ? { action_readiness: parsedExecute.action_readiness }
              : {}),
            ...(parsedExecute.node_id ? { node_id: parsedExecute.node_id } : {}),
            ...(parsedExecute.next_actions?.length
              ? { next_actions: parsedExecute.next_actions }
              : {}),
          });
        }
      } catch (err) {
        return returnWorkGraphPacketOrThrow(err, wgCtx());
      }
      return refresh();
    }
    case 'agents.ensure_agent': {
      const nodeId = String(params.node_id ?? '');
      const ensureBody = {
        node_id: nodeId,
        ...(actionHome ? { home: actionHome } : {}),
        ...(resolvedEnv && !actionHome ? { env_uuid: resolvedEnv } : {}),
        ...(wgLocale ? { locale: wgLocale } : {}),
      };
      try {
        if (params.create === false) {
          await fleet.ensureAgent(projectId, { ...ensureBody, create: false });
        } else {
          await ensureAgentSaga(
            fleet,
            projectId,
            nodeId,
            resolvedEnv || undefined,
            wgLocale,
            actionHome,
          );
        }
      } catch (err) {
        return returnWorkGraphPacketOrThrow(err, wgCtx());
      }
      return refresh();
    }
    case 'agents.plan_recovery_scan': {
      try {
        const scan = await fleet.planRecoveryScan(projectId, {
          ...params,
          ...(resolvedEnv && !actionHome ? { env_uuid: resolvedEnv } : {}),
          ...(actionHome ? { home: actionHome } : {}),
        });
        hooks?.onRecoveryScan?.(scan);
      } catch (err) {
        return returnWorkGraphPacketOrThrow(err, wgCtx());
      }
      return refresh();
    }
    case 'agents.plan_propose': {
      if (hooks?.runPreflightBeforeMutate !== false) {
        await executeWorkGraphPreflightRead(
          fleet,
          projectId,
          hooks?.preflightStep,
          merged,
          { graphHome: hooks?.graphHome, envUuid: resolvedEnv || envUuid },
        );
      }
      try {
        const proposeBody = {
          mode: params.mode ? String(params.mode) : undefined,
          node_id: params.node_id ? String(params.node_id) : undefined,
          goal_text: params.goal_text ? String(params.goal_text) : undefined,
          routed_goal: params.routed_goal,
          validation_mode: params.validation_mode as PlanProposeRequestBody['validation_mode'],
          max_children: typeof params.max_children === 'number' ? params.max_children : undefined,
          use_llm: params.use_llm === true,
          draft_tree:
            params.draft_tree && typeof params.draft_tree === 'object'
              ? (params.draft_tree as Record<string, unknown>)
              : undefined,
          allow_generic_acceptance: params.allow_generic_acceptance === true,
          ...(wgLocale ? { locale: wgLocale } : {}),
          ...(actionHome ? { home: actionHome } : {}),
          ...(resolvedEnv && !actionHome ? { env_uuid: resolvedEnv } : {}),
        };
        const proposed =
          actionHome && fleet.planProposeMcp
            ? (await fleet.planProposeMcp(
                projectId,
                proposeBody,
              )) as PlanProposeResult
            : fleet.planPropose
              ? await fleet.planPropose(projectId, proposeBody)
              : null;
        if (proposed) {
          hooks?.onPropose?.(proposed as PlanProposeResult);
        } else {
          throw new Error('work_graph_action_not_dispatchable');
        }
        return refresh();
      } catch (err) {
        return returnWorkGraphPacketOrThrow(err, wgCtx());
      }
    }
    case 'agents.plan_patch': {
      if (hooks?.runPreflightBeforeMutate !== false) {
        await executeWorkGraphPreflightRead(
          fleet,
          projectId,
          hooks?.preflightStep,
          merged,
          { graphHome: hooks?.graphHome, envUuid: resolvedEnv || envUuid },
        );
      }
      const patchBody = {
        ...params,
        ...(actionHome ? { home: actionHome } : {}),
        ...(resolvedEnv && !actionHome ? { env_uuid: resolvedEnv } : {}),
        ...(wgLocale ? { locale: wgLocale } : {}),
      };
      if (actionHome) delete patchBody.env_uuid;
      const hasOps =
        Array.isArray(params.ops) ||
        (Array.isArray(params.archive_ids) && params.archive_ids.length > 0);
      const hasFullPatch = Boolean(params.patch && typeof params.patch === 'object');
      try {
        if (hasOps && !hasFullPatch && fleet.patchPlanOps) {
          emitPlanMutation(
            await fleet.patchPlanOps(projectId, patchBody as {
              ops?: Array<Record<string, unknown>>;
              archive_ids?: string[];
              if_match_revision?: number;
              home?: 'project' | 'self' | 'project_self';
              env_uuid?: string;
            }),
          );
        } else if (fleet.planPatchMcp) {
          emitPlanMutation(await fleet.planPatchMcp(projectId, patchBody));
        } else if (fleet.patchPlanOps && Array.isArray(params.ops)) {
          emitPlanMutation(
            await fleet.patchPlanOps(projectId, patchBody as {
              ops: Array<Record<string, unknown>>;
              if_match_revision?: number;
              home?: 'project' | 'self' | 'project_self';
              env_uuid?: string;
            }),
          );
        } else if (fleet.patchPlan && params.patch && typeof params.patch === 'object') {
          emitPlanMutation(
            await fleet.patchPlan(projectId, {
              patch: params.patch as Record<string, unknown>,
              replace: params.replace === true,
              ...(typeof params.if_match_revision === 'number'
                ? { if_match_revision: params.if_match_revision }
                : {}),
              ...(actionHome ? { home: actionHome } : {}),
              ...(resolvedEnv && !actionHome ? { env_uuid: resolvedEnv } : {}),
            }),
          );
        } else {
          throw new Error('work_graph_action_not_dispatchable');
        }
      } catch (err) {
        return returnWorkGraphPacketOrThrow(err, wgCtx());
      }
      return refresh();
    }
    case 'agents.plan_apply_proposal': {
      const applyBody = {
        proposal: params.proposal as Record<string, unknown>,
        ...(typeof params.if_match_revision === 'number'
          ? { if_match_revision: params.if_match_revision }
          : {}),
        ...(params.validation_mode === 'strict' || params.validation_mode === 'persist_unexecutable'
          ? { validation_mode: params.validation_mode }
          : {}),
        ...(actionHome ? { home: actionHome } : {}),
        ...(resolvedEnv && !actionHome ? { env_uuid: resolvedEnv } : {}),
      };
      try {
        if (actionHome && fleet.planApplyProposalMcp) {
          emitPlanMutation(await fleet.planApplyProposalMcp(projectId, applyBody));
        } else if (fleet.planApplyProposal) {
          emitPlanMutation(await fleet.planApplyProposal(projectId, applyBody));
        } else {
          throw new Error('work_graph_action_not_dispatchable');
        }
      } catch (err) {
        return returnWorkGraphPacketOrThrow(err, wgCtx());
      }
      return refresh();
    }
    case 'agents.plan_reclaim_stale': {
      if (!fleet.reclaimStalePlanClaims) break;
      const nodeIds = Array.isArray(params.node_ids)
        ? params.node_ids.map((id) => String(id).trim()).filter(Boolean)
        : undefined;
      const reclaimBody = {
        ...(actionHome ? { home: actionHome } : {}),
        ...(resolvedEnv && !actionHome ? { env_uuid: resolvedEnv } : {}),
        ...(nodeIds?.length ? { node_ids: nodeIds } : {}),
      };
      try {
        const reclaimed = await fleet.reclaimStalePlanClaims(
          projectId,
          Object.keys(reclaimBody).length ? reclaimBody : undefined,
        );
        const reclaimedRow = reclaimed as { changed?: unknown; task_list?: unknown } | undefined;
        if (reclaimedRow && (reclaimedRow.changed != null || reclaimedRow.task_list != null)) {
          emitPlanMutation(reclaimed);
        }
      } catch (err) {
        return returnWorkGraphPacketOrThrow(err, wgCtx());
      }
      return refresh();
    }
    case 'agents.plan_compaction_preview': {
      if (!fleet.planCompactionPreviewMcp) break;
      const previewBody: Record<string, unknown> = {
        ...(actionHome ? { home: actionHome } : {}),
        ...(resolvedEnv && !actionHome ? { env_uuid: resolvedEnv } : {}),
      };
      const previewLocale = pickWorkGraphLocale(params);
      if (previewLocale) previewBody.locale = previewLocale;
      try {
        const previewResult = await fleet.planCompactionPreviewMcp(projectId, previewBody);
        hooks?.onPlanCompactionPreview?.(previewResult);
      } catch (err) {
        return returnWorkGraphPacketOrThrow(err, wgCtx());
      }
      return refresh();
    }
    case 'agents.plan_heal_leaf': {
      if (!fleet.planHealLeafMcp) break;
      const healBody: Record<string, unknown> = {
        ...(actionHome ? { home: actionHome } : {}),
        ...(resolvedEnv && !actionHome ? { env_uuid: resolvedEnv } : {}),
      };
      const wgLocale = pickWorkGraphLocale(params);
      if (wgLocale) healBody.locale = wgLocale;
      if (params.dry_run === true) healBody.dry_run = true;
      try {
        const healResult = await fleet.planHealLeafMcp(projectId, healBody);
        hooks?.onPlanHealLeaf?.(healResult);
      } catch (err) {
        return returnWorkGraphPacketOrThrow(err, wgCtx());
      }
      return refresh();
    }
    case 'agents.create_from_template':
      if (!fleet.createFromTemplate) break;
      await fleet.createFromTemplate(projectId, {
        template_id: String(params.template_id ?? ''),
        name: params.name ? String(params.name) : undefined,
        description: params.description ? String(params.description) : undefined,
        node_id: params.node_id ? String(params.node_id) : undefined,
        template_input:
          params.template_input && typeof params.template_input === 'object'
            ? (params.template_input as Record<string, unknown>)
            : undefined,
        ...(actionHome ? { home: actionHome } : {}),
        ...(resolvedEnv && !actionHome ? { env_uuid: resolvedEnv } : {}),
      });
      return refresh();
    case 'agents.plan_get':
      if (fleet.planGet) {
        const planGetParams: Record<string, unknown> = {
          ...(resolvedEnv && !actionHome ? { env_uuid: resolvedEnv } : {}),
          ...(actionHome ? { home: actionHome } : {}),
        };
        const forwardKeys = [
          'detail',
          'limit',
          'max_depth',
          'node_id',
          'page_id',
          'tag',
          'cursor',
          'q',
          'status',
          'parent_id',
          'if_match_revision',
          'include_claimable',
          'include_execution_eligibility',
          'include',
        ] as const;
        for (const key of forwardKeys) {
          if (params[key] !== undefined) planGetParams[key] = params[key];
        }
        if (params.focus_node_id) planGetParams.focus_node_id = String(params.focus_node_id);
        if (params.focus_ref && typeof params.focus_ref === 'object') {
          planGetParams.focus_ref = params.focus_ref as Record<string, unknown>;
        }
        await fleet.planGet(projectId, clampPlanGetDispatchDetail(planGetParams));
      }
      return refresh();
    case 'agents.team':
    case 'agents.team.create':
      if (!fleet.teamCreate) break;
      try {
        await fleet.teamCreate(projectId, {
          message: String(params.message ?? params.goal_text ?? ''),
          ...(resolvedEnv && !actionHome ? { env_uuid: resolvedEnv } : {}),
          ...(actionHome ? { home: actionHome } : {}),
          ...(wgLocale ? { locale: wgLocale } : {}),
        });
      } catch (err) {
        return returnWorkGraphPacketOrThrow(err, wgCtx());
      }
      return refresh();
    case 'agents.plan_process_backlog':
      if (!fleet.processPlanBacklog) break;
      try {
        emitPlanMutation(
          await fleet.processPlanBacklog(projectId, {
            ...(params.node_id ? { node_id: String(params.node_id) } : {}),
            ...(params.auto_apply === true || params.auto_apply === false
              ? { auto_apply: params.auto_apply }
              : {}),
            ...(params.auto_apply_policy
              ? { auto_apply_policy: String(params.auto_apply_policy) }
              : {}),
            ...(typeof params.max_nodes === 'number' ? { max_nodes: params.max_nodes } : {}),
            ...(actionHome ? { home: actionHome } : {}),
            ...(resolvedEnv && !actionHome ? { env_uuid: resolvedEnv } : {}),
          }),
        );
      } catch (err) {
        return returnWorkGraphPacketOrThrow(err, wgCtx());
      }
      return refresh();
    case 'agents.graph_file_put':
      if (!fleet.graphFilePut) break;
      try {
        await fleet.graphFilePut(projectId, {
          ...params,
          ...(actionHome ? { home: actionHome } : {}),
          ...(resolvedEnv && !actionHome ? { env_uuid: resolvedEnv } : {}),
        });
      } catch (err) {
        return returnWorkGraphPacketOrThrow(err, wgCtx());
      }
      return refresh();
    case 'agents.graph_file_get':
      if (!fleet.graphFileGet) break;
      try {
        const graphFileData = await fleet.graphFileGet(projectId, {
          ...params,
          ...(actionHome ? { home: actionHome } : {}),
          ...(resolvedEnv && !actionHome ? { env_uuid: resolvedEnv } : {}),
        });
        if (graphFileData && typeof graphFileData === 'object') {
          hooks?.onGraphFileResult?.(graphFileData as Record<string, unknown>);
        }
      } catch (err) {
        return returnWorkGraphPacketOrThrow(err, wgCtx());
      }
      return refresh();
    case 'agents.graph_file_edit':
      if (!fleet.graphFileEdit) break;
      try {
        await fleet.graphFileEdit(projectId, {
          ...params,
          ...(actionHome ? { home: actionHome } : {}),
          ...(resolvedEnv && !actionHome ? { env_uuid: resolvedEnv } : {}),
        });
      } catch (err) {
        return returnWorkGraphPacketOrThrow(err, wgCtx());
      }
      return refresh();
    case 'agents.graph_file_list':
      if (!fleet.graphFileList) break;
      try {
        await fleet.graphFileList(projectId, {
          ...params,
          ...(actionHome ? { home: actionHome } : {}),
          ...(resolvedEnv && !actionHome ? { env_uuid: resolvedEnv } : {}),
        });
      } catch (err) {
        return returnWorkGraphPacketOrThrow(err, wgCtx());
      }
      return refresh();
    default:
      throw new Error('work_graph_action_not_dispatchable');
  }
  throw new Error('work_graph_action_not_dispatchable');
}

/** Headless closed loop until idle or max iterations (WG-1 SDK). */
/**
 * After a successful domain MCP call matching `next_action`, the server advances
 * workflow state via `workflow_transition` — call `agents.work_next` again; do not
 * repeat the same tool unless the packet still lists it.
 */
export async function runWorkGraphLoop(
  fleet: WorkGraphFleetLike,
  projectId: number,
  opts?: {
    maxIterations?: number;
    onPacket?: (packet: WorkNextPacket) => void;
    /** Sent as ``goal_id`` on every ``workNext`` refresh (AgentsFleet body). */
    goalId?: string;
    /** Sandbox generation anchor for every refresh and follow action. */
    envUuid?: string;
    home?: 'project' | 'self' | 'project_self';
  },
): Promise<WorkNextPacket> {
  const goalId = explicitGoalId(opts?.goalId);
  const env = String(opts?.envUuid ?? '').trim() || undefined;
  const home = opts?.home;
  const graphHome = parseGraphHomeParam(home);
  let packet = parseWorkNextPacket(await refreshWorkNext(fleet, projectId, goalId, env, home));
  const max = opts?.maxIterations ?? 20;
  let lastProgressKey = '';
  for (let i = 0; i < max; i += 1) {
    opts?.onPacket?.(packet);
    if (packet.state === 'idle') break;
    let step = primaryWorkGraphAction(packet);
    if (!step?.action) break;
    if (
      step.action === 'agents.plan_claim' &&
      !canClaimFromWorkNext(packet)
    ) {
      const recoveryNext = packet.recovery?.next_actions;
      const rec = Array.isArray(recoveryNext) ? recoveryNext[0] : undefined;
      if (rec?.action && rec.action !== 'agents.plan_claim') {
        step = {
          action: rec.action,
          params: (rec.params as Record<string, unknown>) ?? {},
        };
      } else {
        break;
      }
    }
    const nodeId = String(step.params?.node_id ?? packet.node_id ?? '');
    const rev = String(packet.revision ?? step.params?.if_match_revision ?? '');
    if (
      step.action === 'agents.plan_execute' &&
      !canExecuteFromWorkNext(packet)
    ) {
      break;
    }
    const progressKey = `${step.action}|${nodeId}|${rev}`;
    if (progressKey && progressKey === lastProgressKey) break;
    lastProgressKey = progressKey;
    let params: Record<string, unknown> = { ...(step.params ?? {}) };
    if (step.action === 'agents.plan_claim') {
      params = mergeClaimCasParams(params, packet);
    }
    params = mergeEnvUuidParam(
      { ...params, ...mcpGraphHomeFields(home) },
      isPersonalGraphHome(graphHome) ? undefined : env,
    );
    const preflightStep = workGraphPreflightStepFromPacket(packet);
    const runPreflight =
      Boolean(preflightStep) &&
      (step.action === 'agents.plan_patch' || step.action === 'agents.plan_propose');
    packet = parseWorkNextPacket(
      await followWorkGraphAction(fleet, projectId, { ...step, params }, goalId, env || undefined, {
        graphHome: home,
        preflightStep: runPreflight ? preflightStep : null,
        runPreflightBeforeMutate: runPreflight,
      }),
    );
    if (runPreflight) {
      packet = clearWorkGraphPreflightFromPacket(packet);
    }
    if (packet.state === 'idle') break;
  }
  return packet;
}
