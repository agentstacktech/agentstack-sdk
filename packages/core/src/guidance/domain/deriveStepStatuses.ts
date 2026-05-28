import type { StepStatus } from '../types/pathStepStatus';
import type { PathStepPlan, PlaybookStateV2 } from '../types/playbookTypes';

export function deriveStepStatuses(
  steps: Omit<PathStepPlan, 'status'>[],
  state: PlaybookStateV2,
  focusedStepId: string | null,
): PathStepPlan[] {
  let firstIncompleteSeen = false;

  return steps.map((step) => {
    const entry = state.stepProgress[step.nodeId];
    let status: StepStatus = entry?.status ?? 'locked';

    if (entry?.status === 'done' || entry?.status === 'skipped' || entry?.status === 'in_progress') {
      status = entry.status;
    } else if (state.completedNodeIds.includes(step.nodeId)) {
      status = 'done';
    } else if (!firstIncompleteSeen) {
      firstIncompleteSeen = true;
      status = focusedStepId === step.nodeId ? 'current' : 'available';
    } else {
      status = 'locked';
    }

    if (focusedStepId === step.nodeId && status !== 'done' && status !== 'skipped') {
      status = status === 'in_progress' ? 'in_progress' : 'current';
    }

    return { ...step, status };
  });
}
