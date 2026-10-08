/**
 * Plan graph mutation error classification (`core.agents.plan_graph.gen1`).
 * Headless — mirrors agentstack-frontend planGraphErrors.ts.
 */

function errorDetailString(error: unknown): string {
  if (!error || typeof error !== 'object') return '';
  const err = error as {
    response?: { data?: { detail?: unknown; error?: string; error_code?: string } };
    message?: string;
  };
  const data = err.response?.data;
  if (typeof data?.error_code === 'string') return data.error_code;
  if (typeof data?.error === 'string') return data.error;
  const detail = data?.detail;
  if (typeof detail === 'string') return detail;
  if (detail && typeof detail === 'object' && 'error_code' in detail) {
    return String((detail as { error_code?: string }).error_code || '');
  }
  if (typeof err.message === 'string') return err.message;
  return '';
}

export function isPlanRevisionConflict(error: unknown): boolean {
  const err = error as { response?: { status?: number } };
  if (err.response?.status === 409) {
    const code = errorDetailString(error).toLowerCase();
    if (code && code !== 'wip_full' && code !== 'plan_claim_owner_conflict') {
      return code.includes('plan_revision_conflict') || code.includes('revision_conflict');
    }
    if (!code) return true;
  }
  const hay = errorDetailString(error).toLowerCase();
  return hay.includes('plan_revision_conflict');
}

export function isPlanWipFull(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const err = error as { response?: { data?: { error_code?: string; wip_full?: boolean } } };
  const data = err.response?.data;
  if (data?.wip_full === true) return true;
  return errorDetailString(error).toLowerCase() === 'wip_full';
}

export function isPlanRoleMismatch(error: unknown): boolean {
  const code = errorDetailString(error).toLowerCase();
  return code === 'role_mismatch' || code.includes('role_mismatch');
}

export function isPlanSpecializationMismatch(error: unknown): boolean {
  const code = errorDetailString(error).toLowerCase();
  return code === 'specialization_mismatch' || code.includes('specialization_mismatch');
}

const PLAN_MUTATION_MESSAGES: Record<string, string> = {
  mode_not_implemented: 'This planner mode is not available yet.',
  node_already_atomic: 'This item is already atomic — no further decomposition.',
  node_not_found: 'Plan node not found — refresh and retry.',
  plan_revision_conflict: 'Plan changed elsewhere — refresh and retry.',
  immutable_field_changed: 'Planner cannot change locked fields on existing nodes.',
  replan_budget_exceeded: 'Replan limit reached for this node.',
  planner_generic_duplicate_children: 'Subtask titles look generic — use semantic step names.',
  planner_duplicate_children: 'Duplicate subtask titles detected.',
  validation_error: 'Planner validation failed — review the proposal.',
  supersede_requires_review: 'Supersede needs manual review — decompose one node instead.',
  create_count_exceeded: 'Too many subtasks in one backlog pass — try a smaller batch.',
  permission_denied: 'Planner tier required for this action.',
  wip_full: 'WIP limit reached — complete or cancel an in-progress task before claiming more.',
  role_mismatch:
    'This is not an API key limit. Agent role does not match the task — hand off with agents.work_next handoff=true.',
  specialization_mismatch:
    'This is not an API key limit. Agent specialization does not match the task — hand off with agents.work_next handoff=true.',
  skill_mismatch:
    'This is not an API key limit. Agent is missing a required skill — hand off with agents.work_next handoff=true.',
  capability_mismatch:
    'Missing required capabilities — use agents.ensure_agent (H5) or plan_propose mode=repair_plan. Not handoff.',
  provision_required:
    'No compatible live agent — ensure_agent create=false (H5) then create=true, then plan_claim.',
  missing_capability:
    'Fleet lacks required capabilities — ensure_agent (H5) saga or repair_plan.',
  no_compatible_agent:
    'No fleet match — ensure_agent (H5) or repair_plan.',
  node_not_eligible: 'Task is not eligible to claim yet — check dependencies and status.',
  plan_claim_owner_conflict: 'Task is already owned by another agent.',
};

function recoveryBlockText(error: unknown, locale?: string): string {
  if (!error || typeof error !== 'object') return '';
  const err = error as {
    response?: { data?: Record<string, unknown> };
    step?: { data?: Record<string, unknown>; result?: Record<string, unknown> };
  };
  const data = err.response?.data ?? err.step?.data ?? err.step?.result ?? {};
  const detail = data.detail;
  const claim = (data.claim_result ?? {}) as Record<string, unknown>;
  const block =
    (data.recovery_block as { en?: string; ru?: string; pt?: string } | undefined) ||
    (detail && typeof detail === 'object'
      ? (detail as { recovery_block?: { en?: string; ru?: string; pt?: string } }).recovery_block
      : undefined) ||
    (claim.recovery_block as { en?: string; ru?: string; pt?: string } | undefined);
  if (!block) return '';
  const lang = (locale || 'en').slice(0, 2);
  const key = lang === 'ru' || lang === 'pt' ? lang : 'en';
  return String(block[key] || block.en || '').trim();
}

/** Human-readable planner mutation error for Copilot toasts. */
export function formatPlanMutationUserMessage(
  error: unknown,
  t?: (key: string, fallback: string) => string,
  locale?: string,
): string {
  const recovered = recoveryBlockText(error, locale);
  if (recovered) return recovered;
  const hay = errorDetailString(error).toLowerCase();
  const code =
    hay in PLAN_MUTATION_MESSAGES
      ? hay
      : Object.keys(PLAN_MUTATION_MESSAGES).find((k) => hay.includes(k)) || '';
  const fallback = code ? PLAN_MUTATION_MESSAGES[code] : 'Plan update failed — refresh and retry.';
  if (t && code) {
    return t(`project_copilot.plan_error_${code}`, fallback);
  }
  return fallback;
}
