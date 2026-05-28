import type { PathPlanResult, PlaybookStateV2 } from '../types/playbookTypes';

/** Keep currentNodeId aligned with PathPlan focus (`frontend.platform.path_session.gen1`). */
export function syncCurrentNodeId(plan: PathPlanResult, state: PlaybookStateV2): string {
  if (plan.focusedStepId && plan.steps.some((s) => s.nodeId === plan.focusedStepId)) {
    return plan.focusedStepId;
  }
  const open = plan.steps.find(
    (s) => s.status === 'current' || s.status === 'available' || s.status === 'in_progress',
  );
  if (open) return open.nodeId;
  const outcome = plan.steps.find((s) => s.kind === 'outcome');
  return outcome?.nodeId ?? state.currentNodeId;
}
