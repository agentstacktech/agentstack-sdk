/** Headless plan / Work Graph types (mirrors shared/atoms/agent_task_list.py). */

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
  | 'goal';

export type PlanNodeLayer = 'business' | 'strategic' | 'tactical' | 'execution' | 'unknown';

export type NodeScope = 'project' | 'agent' | 'personal';

export type PriorityClass = 'P0' | 'P1' | 'P2' | 'P3' | 'P4' | 'P5';

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
  children?: PlanNode[];
};

export type PlanGraph = {
  version?: number;
  revision?: number;
  root_prompt?: string;
  active_goal_id?: string | null;
  tasks?: PlanNode[];
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

export type PlannerValidation = {
  ok: boolean;
  errors?: string[];
  warnings?: string[];
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

/** Enriched claim preview from plan_get / orchestrator (UI + MCP). */
export type PlanClaimPreview = {
  max_wip: number;
  wip_room: number;
  wip_full: boolean;
  in_progress_project: number;
  claimable: PlanClaimableRow[];
  claimable_count: number;
  blocked_sample?: PlanBlockedSampleRow[];
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

export type WorkNextPacket = {
  goal?: { id?: string; title?: string; progress?: unknown };
  state?: WorkNextState;
  next_work?: WorkNextNextWork;
  blocked_work?: WorkNextBlockedRow[];
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
  claim?: { available?: boolean; lease_seconds?: number };
  claim_result?: Record<string, unknown> & {
    claim_count?: number;
    error_code?: string;
    recovery_block?: { en?: string; ru?: string; pt?: string };
  };
  recovery?: Record<string, unknown>;
  /** Localized operator hint when state=blocked (mcp_recovery). */
  recovery_hint?: string;
  locale?: string;
  instruction_packet?: Record<string, unknown>;
  next_actions?: Array<{ action?: string; params?: Record<string, unknown> }>;
  /** Canonical single-step projection — prefer over parsing next_actions[0]. */
  next_action?: { action?: string; params?: Record<string, unknown>; reason?: string };
  alternative_actions?: Array<{ action?: string; params?: Record<string, unknown> }>;
  /** Optional runtime diagnostics (harness v2 W4 + summary bottleneck). */
  diagnostics?: {
    harness_state?: HarnessStateProjection;
    bottleneck?: { node_id?: string; reason?: string };
  };
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
  const row = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
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
  const workState =
    typeof row.work_state === 'string'
      ? row.work_state
      : typeof row.state === 'string'
        ? row.state
        : undefined;
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
  const row = run as Record<string, unknown>;
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

/** False when server RBAC/fleet marked claim unavailable (W13-03). */
export function canClaimFromWorkNext(packet?: WorkNextPacket | null): boolean {
  if (!packet) return false;
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

/** CAS revision: packet next_action wins, else graph revision from orchestrator GET. */
export function claimRevisionFromPacket(
  packet?: WorkNextPacket | null,
  graphRevision?: number,
): number | undefined {
  const fromAction = packet?.next_action?.params?.if_match_revision;
  if (typeof fromAction === 'number') return fromAction;
  if (typeof graphRevision === 'number') return graphRevision;
  return undefined;
}

/** Prefer canonical next_action over recovery.next_actions[0] (finalization W8). */
export function primaryWorkGraphAction(
  packet?: WorkNextPacket | null,
): { action?: string; params?: Record<string, unknown>; reason?: string } | undefined {
  if (!packet) return undefined;
  const canonical = packet.next_action;
  if (canonical && typeof canonical.action === 'string' && canonical.action.trim()) {
    return {
      action: canonical.action.trim(),
      ...(canonical.params && typeof canonical.params === 'object'
        ? { params: canonical.params as Record<string, unknown> }
        : {}),
      ...(typeof canonical.reason === 'string' && canonical.reason.trim()
        ? { reason: canonical.reason.trim() }
        : {}),
    };
  }
  const fromList = packet.next_actions?.[0];
  if (fromList && typeof fromList.action === 'string' && fromList.action.trim()) {
    return {
      action: fromList.action.trim(),
      ...(fromList.params && typeof fromList.params === 'object'
        ? { params: fromList.params as Record<string, unknown> }
        : {}),
    };
  }
  const recovery = packet.recovery as
    | { next_actions?: Array<{ action?: string; params?: Record<string, unknown> }> }
    | undefined;
  const fromRecovery = recovery?.next_actions?.[0];
  if (fromRecovery && typeof fromRecovery.action === 'string' && fromRecovery.action.trim()) {
    return {
      action: fromRecovery.action.trim(),
      ...(fromRecovery.params && typeof fromRecovery.params === 'object'
        ? { params: fromRecovery.params as Record<string, unknown> }
        : {}),
    };
  }
  return undefined;
}

export function parseWorkNextPacket(raw: unknown): WorkNextPacket {
  if (!raw || typeof raw !== 'object') return {};
  const row = raw as Record<string, unknown>;
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
  const recoveryActions = Array.isArray(recovery?.next_actions)
    ? recovery!.next_actions.filter((item) => item && typeof item === 'object') as Array<{
        action?: string;
        params?: Record<string, unknown>;
      }>
    : undefined;
  const next_actions = Array.isArray(row.next_actions)
    ? row.next_actions.filter((item) => item && typeof item === 'object') as Array<{
        action?: string;
        params?: Record<string, unknown>;
      }>
    : recoveryActions?.length
      ? recoveryActions
      : undefined;
  const claim =
    row.claim && typeof row.claim === 'object'
      ? (row.claim as { available?: boolean; lease_seconds?: number })
      : undefined;
  const goal =
    row.goal && typeof row.goal === 'object'
      ? (row.goal as { id?: string; title?: string; progress?: unknown })
      : undefined;
  return {
    ...(goal ? { goal } : {}),
    ...(typeof row.state === 'string' ? { state: row.state as WorkNextState } : {}),
    ...(row.next_work && typeof row.next_work === 'object'
      ? {
          next_work: (() => {
            const nw = { ...(row.next_work as Record<string, unknown>) };
            const sid = String(nw.suggested_agent_id ?? '').trim();
            if (sid) nw.suggested_agent_id = sid;
            else delete nw.suggested_agent_id;
            return nw;
          })(),
        }
      : {}),
    ...(blocked?.length ? { blocked_work: blocked } : {}),
    ...(row.plan_summary && typeof row.plan_summary === 'object'
      ? { plan_summary: row.plan_summary as Record<string, unknown> }
      : {}),
    ...(row.goal_summary && typeof row.goal_summary === 'object'
      ? { goal_summary: row.goal_summary as Record<string, unknown> }
      : {}),
    ...(claim ? { claim } : {}),
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
  return {
    ...(harness ? { harness_state: harness } : {}),
    ...(bottleneck ? { bottleneck } : {}),
  };
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
};

export type GraphViewerModel = {
  nodes: GraphViewerNode[];
  metrics: Record<string, unknown>;
  state?: WorkNextState;
};

/** Shared DTO for human viewer + external agents (WG-4). */
export function buildGraphViewerModel(
  plan: PlanGraph,
  workNext?: WorkNextPacket | null,
  focusNodeId?: string,
): GraphViewerModel {
  const focus = focusNodeId ?? workNext?.next_work?.node_id;
  const tasks = plan.tasks ?? [];
  const nodes: GraphViewerNode[] = tasks.map((node) => ({
    ...node,
    isFocus: focus ? String(node.id) === String(focus) : false,
  }));
  return {
    nodes,
    metrics: graphViewerMetrics(workNext),
    state: workNext?.state,
  };
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
  return {
    ...plan,
    ...(bottleneck ? { bottleneck } : {}),
    ...(typeof weighted === 'number' ? { weighted_completion_percent: weighted } : {}),
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
};

/** H5 ensure saga — preview before create=true. */
export async function ensureAgentSaga(
  fleet: WorkGraphFleetLike,
  projectId: number,
  nodeId: string,
  envUuid?: string,
): Promise<Record<string, unknown>> {
  const env = String(envUuid ?? '').trim();
  const body = {
    node_id: nodeId,
    ...(env ? { env_uuid: env } : {}),
  };
  const preview = await fleet.ensureAgent(projectId, { ...body, create: false });
  const row = preview as { provision_required?: boolean };
  if (!row.provision_required) return preview;
  return fleet.ensureAgent(projectId, { ...body, create: true });
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

function refreshWorkNext(
  fleet: WorkGraphFleetLike,
  projectId: number,
  goalId?: string,
  envUuid?: string,
): Promise<WorkNextPacket> {
  const gid = explicitGoalId(goalId);
  const env = String(envUuid ?? '').trim();
  const body: Record<string, unknown> = {};
  if (gid) body.goal_id = gid;
  if (env) body.env_uuid = env;
  if (!gid && !env) return fleet.workNext(projectId);
  return fleet.workNext(projectId, body);
}

/** Dispatch canonical work-graph MCP actions via fleet (DRY with Copilot). */
export async function followWorkGraphAction(
  fleet: WorkGraphFleetLike,
  projectId: number,
  action: { action?: string; params?: Record<string, unknown> },
  goalId?: string,
): Promise<WorkNextPacket> {
  const name = String(action.action ?? '').trim();
  const merged = mergeGoalIdParam(action.params ?? {}, goalId);
  const params = merged.params;
  const envUuid = typeof params.env_uuid === 'string' ? params.env_uuid.trim() : '';
  const refresh = () => refreshWorkNext(fleet, projectId, merged.goalId, envUuid || undefined);
  switch (name) {
    case 'agents.work_next':
      return fleet.workNext(projectId, params);
    case 'agents.work_status':
      return fleet.workStatus(projectId, params);
    case 'agents.plan_claim': {
      const agentId = String(params.agent_id ?? params.prefer_agent_id ?? 'agent').trim();
      const nodeIds = Array.isArray(params.node_ids)
        ? params.node_ids.map(String)
        : params.node_id
          ? [String(params.node_id)]
          : [];
      const ifMatch = params.if_match_revision;
      await fleet.claimPlanNodes(projectId, {
        agent_id: agentId,
        node_ids: nodeIds,
        ...(typeof ifMatch === 'number' ? { if_match_revision: ifMatch } : {}),
        ...(envUuid ? { env_uuid: envUuid } : {}),
      });
      return refresh();
    }
    case 'agents.plan_execute':
      await fleet.planExecute(projectId, {
        node_id: String(params.node_id ?? ''),
        agent_id: params.agent_id ? String(params.agent_id) : undefined,
        goal_text: params.goal_text ? String(params.goal_text) : undefined,
        mode: params.mode ? String(params.mode) : undefined,
        ...(envUuid ? { env_uuid: envUuid } : {}),
      });
      return refresh();
    case 'agents.ensure_agent': {
      const nodeId = String(params.node_id ?? '');
      const ensureBody = {
        node_id: nodeId,
        ...(envUuid ? { env_uuid: envUuid } : {}),
      };
      if (params.create === false) {
        await fleet.ensureAgent(projectId, { ...ensureBody, create: false });
      } else {
        await ensureAgentSaga(fleet, projectId, nodeId, envUuid || undefined);
      }
      return refresh();
    }
    case 'agents.plan_recovery_scan':
      await fleet.planRecoveryScan(projectId, params);
      return refresh();
    default:
      return refresh();
  }
}

/** Headless closed loop until idle or max iterations (WG-1 SDK). */
export async function runWorkGraphLoop(
  fleet: WorkGraphFleetLike,
  projectId: number,
  opts?: {
    maxIterations?: number;
    onPacket?: (packet: WorkNextPacket) => void;
    /** Sent as ``goal_id`` on every ``workNext`` refresh (AgentsFleet body). */
    goalId?: string;
  },
): Promise<WorkNextPacket> {
  const goalId = explicitGoalId(opts?.goalId);
  let packet = await refreshWorkNext(fleet, projectId, goalId);
  const max = opts?.maxIterations ?? 20;
  for (let i = 0; i < max; i += 1) {
    opts?.onPacket?.(packet);
    if (packet.state === 'idle') break;
    const next = primaryWorkGraphAction(packet);
    if (!next?.action) break;
    packet = await followWorkGraphAction(fleet, projectId, next, goalId);
    if (packet.state === 'idle') break;
  }
  return packet;
}
