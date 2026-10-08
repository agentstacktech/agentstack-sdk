/**
 * Discovery workflow next-step picker — CQRS read model vs command bus.
 * Genetic tag: sdk.platform.gen1
 */

export interface RecommendedAction {
  action: string;
  params?: Record<string, unknown>;
  reason?: string;
  confidence?: number;
}

export interface DiscoveryWorkflowSlot {
  step_actions?: Array<string | RecommendedAction>;
}

export interface DiscoverySearchResponse {
  recommended_actions?: RecommendedAction[];
  actions?: RecommendedAction[];
  selected_workflow?: { slots?: DiscoveryWorkflowSlot };
  routed_goal?: { step_actions?: Array<string | RecommendedAction> };
}

function toRecommended(row: string | RecommendedAction): RecommendedAction | null {
  if (typeof row === 'string') {
    const action = row.trim();
    return action ? { action } : null;
  }
  if (row && typeof row === 'object' && typeof row.action === 'string' && row.action.trim()) {
    return row;
  }
  return null;
}

/** Catalog browse ≠ workflow next step. Never use actions[0] for workflow execution. */
export function pickDiscoveryNextStep(
  res: DiscoverySearchResponse,
): RecommendedAction | null {
  const recommended = res.recommended_actions?.[0];
  if (recommended?.action) {
    return recommended;
  }
  const workflowStep = res.selected_workflow?.slots?.step_actions?.[0];
  const fromWorkflow = workflowStep ? toRecommended(workflowStep) : null;
  if (fromWorkflow) {
    return fromWorkflow;
  }
  const routedStep = res.routed_goal?.step_actions?.[0];
  const fromRouted = routedStep ? toRecommended(routedStep) : null;
  if (fromRouted) {
    return fromRouted;
  }
  return null;
}
