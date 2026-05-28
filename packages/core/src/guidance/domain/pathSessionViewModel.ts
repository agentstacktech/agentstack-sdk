import type { PathPlanResult, Playbook, PlaybookStateV2 } from '../types/playbookTypes';

export type PathSessionViewModel = {
  playbookId: Playbook['id'];
  title: string;
  percent: number;
  currentIndex: number;
  totalSteps: number;
  currentStepTitle: string;
  etaMin: number;
  plan: PathPlanResult;
  returnPath: string;
};

export function buildPathSessionViewModel(
  playbook: Playbook,
  state: PlaybookStateV2,
  plan: PathPlanResult,
  returnPath: string,
): PathSessionViewModel {
  const countable = plan.steps.filter((s) => s.kind !== 'outcome');
  const current = plan.steps[plan.currentIndex] ?? plan.steps[0];

  return {
    playbookId: playbook.id,
    title: playbook.titleDefault,
    percent: plan.percent,
    currentIndex: plan.currentIndex,
    totalSteps: countable.length,
    currentStepTitle: current?.title ?? playbook.titleDefault,
    etaMin: plan.etaMin,
    plan,
    returnPath,
  };
}
