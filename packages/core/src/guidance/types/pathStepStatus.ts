/**
 * Guided path step statuses (`shared.guidance.gen1`).
 */
export type StepStatus =
  | 'locked'
  | 'available'
  | 'current'
  | 'in_progress'
  | 'done'
  | 'skipped'
  | 'blocked';

export function canFocusStep(status: StepStatus): boolean {
  return status === 'available' || status === 'current' || status === 'in_progress';
}

export function markStepDone(status: StepStatus): StepStatus {
  return status === 'skipped' ? 'skipped' : 'done';
}

export function applyStepSkip(_status: StepStatus): StepStatus {
  return 'skipped';
}
