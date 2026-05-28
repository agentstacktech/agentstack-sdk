import type { PathPlanResult, PathStepPlan } from '../types/playbookTypes';

export function aggregatePathProgress(steps: PathStepPlan[]): {
  percent: number;
  currentIndex: number;
  etaMin: number;
  focusedStepId: string | null;
} {
  const countable = steps.filter((s) => s.kind !== 'outcome');
  const total = countable.length || 1;
  const done = countable.filter((s) => s.status === 'done' || s.status === 'skipped').length;
  const percent = Math.round((done / total) * 100);

  let currentIndex = countable.findIndex(
    (s) => s.status === 'current' || s.status === 'in_progress' || s.status === 'available',
  );
  if (currentIndex < 0) currentIndex = Math.min(done, total - 1);

  const remaining = countable.slice(currentIndex >= 0 ? currentIndex : done);
  const etaMin = remaining.reduce((sum, s) => sum + (s.estimatedMin ?? 3), 0);

  const focused =
    countable.find((s) => s.status === 'current' || s.status === 'in_progress') ??
    countable.find((s) => s.status === 'available') ??
    null;

  return {
    percent,
    currentIndex: currentIndex >= 0 ? currentIndex : 0,
    etaMin,
    focusedStepId: focused?.nodeId ?? null,
  };
}

export function applyAggregateToPlan(steps: PathStepPlan[]): PathPlanResult {
  const agg = aggregatePathProgress(steps);
  return {
    steps,
    currentIndex: agg.currentIndex,
    percent: agg.percent,
    etaMin: agg.etaMin,
    focusedStepId: agg.focusedStepId,
  };
}

export function milestoneBeaconPercent(percent: number): 25 | 50 | 75 | 100 | null {
  if (percent >= 100) return 100;
  if (percent >= 75) return 75;
  if (percent >= 50) return 50;
  if (percent >= 25) return 25;
  return null;
}
