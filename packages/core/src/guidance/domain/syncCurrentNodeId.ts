import type { PathPlanResult, PathStepPlan, PlaybookStateV2 } from '../types/playbookTypes';

const OPEN_STEP_STATUSES = new Set<PathStepPlan['status']>(['current', 'available', 'in_progress']);

function isOpenStep(step: PathStepPlan): boolean {
  return OPEN_STEP_STATUSES.has(step.status);
}

/** G2: open discover-phase questions win over execute steps (`frontend.platform.path_session.gen1`). */
export function findOpenDiscoverQuestionStep(
  plan: PathPlanResult,
): PathStepPlan | undefined {
  return plan.steps.find(
    (s) => s.kind === 'question' && s.phase === 'discover' && isOpenStep(s),
  );
}

/** Keep currentNodeId aligned with PathPlan focus (`frontend.platform.path_session.gen1`). */
export function syncCurrentNodeId(plan: PathPlanResult, state: PlaybookStateV2): string {
  const openQuestion = findOpenDiscoverQuestionStep(plan);
  if (openQuestion) return openQuestion.nodeId;

  if (plan.focusedStepId && plan.steps.some((s) => s.nodeId === plan.focusedStepId)) {
    return plan.focusedStepId;
  }
  const open = plan.steps.find(isOpenStep);
  if (open) return open.nodeId;
  const outcome = plan.steps.find((s) => s.kind === 'outcome');
  return outcome?.nodeId ?? state.currentNodeId;
}
