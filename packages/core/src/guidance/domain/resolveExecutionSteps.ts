import type { ExecutionStepRule, Playbook, PlaybookStateV2 } from '../types/playbookTypes';

function matchesAnswers(answers: Record<string, unknown>, when: Record<string, unknown>): boolean {
  return Object.entries(when).every(([key, value]) => answers[key] === value);
}

/** Resolve conditional task/recipe/verify node ids after questions (`frontend.platform.path_compile.gen1`). */
export function resolveExecutionSteps(playbook: Playbook, state: PlaybookStateV2): string[] {
  const rules: ExecutionStepRule[] = playbook.executionRules ?? [];
  const collected: string[] = [];

  for (const rule of rules) {
    if (matchesAnswers(state.answers, rule.when)) {
      for (const id of rule.steps) {
        if (playbook.nodes[id] && !collected.includes(id)) collected.push(id);
      }
    }
  }

  if (collected.length > 0) return collected;

  const fallback = playbook.defaultExecutionSteps ?? [];
  return fallback.filter((id) => playbook.nodes[id]);
}

/** Legacy sell-digital rules when executionRules omitted. */
export function resolveExecutionStepsLegacy(playbook: Playbook, state: PlaybookStateV2): string[] {
  if (playbook.executionRules?.length) return resolveExecutionSteps(playbook, state);
  if (playbook.id !== 'sell-digital-content') {
    return Object.values(playbook.nodes)
      .filter((n) => n.kind === 'task' || n.kind === 'capability' || n.kind === 'verify')
      .map((n) => n.id);
  }
  const tasks: string[] = [];
  if (state.answers.projectScope === 'new') tasks.push('t_create_project');
  if (state.answers.siteMode === 'host') tasks.push('t_hosting');
  if (state.answers.offerMode === 'asset' || state.answers.offerMode === 'link') {
    tasks.push('t_assets');
  }
  if (state.answers.payment === true) {
    tasks.push('t_integrate', 't_logic');
  }
  return tasks.filter((id) => {
    const n = playbook.nodes[id];
    return n && (n.kind === 'task' || n.kind === 'capability' || n.kind === 'verify');
  });
}
