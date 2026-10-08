/**
 * Plan completion UX copy — parity with workspace copilot (`frontend.project.copilot.gen1`).
 */

import type { PlanCompletionEvidence } from './planGraph';

export const PLAN_COMPLETION_NOT_EVALUABLE_HINT =
  'This step has no automated completion checks yet. Add evidence or run verify before marking done.';

/** User-facing hint when plan focus is not complete (SDK SoT — frontend re-exports). */
export function planCompletionUserHint(
  envelope: PlanCompletionEvidence,
  fallback = 'Plan focus is not complete yet.',
): string {
  if (envelope.allowed) return '';
  if (envelope.status === 'not_evaluable') {
    return fallback || PLAN_COMPLETION_NOT_EVALUABLE_HINT;
  }
  const missing = (envelope.missing_evidence ?? envelope.predicates_missing ?? [])
    .filter(Boolean)
    .slice(0, 3);
  if (missing.length) {
    return fallback;
  }
  const reasons = (envelope.reasons ?? []).filter(Boolean).slice(0, 2);
  if (reasons.length) {
    return `${fallback} ${reasons.join('; ')}.`;
  }
  return fallback;
}
