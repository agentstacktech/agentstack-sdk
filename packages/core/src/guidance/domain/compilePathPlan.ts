import type {
  PathPlanResult,
  PathStepKind,
  PathStepPlan,
  Playbook,
  PlaybookNode,
  PlaybookStateV2,
} from '../types/playbookTypes';
import { deriveStepStatuses } from './deriveStepStatuses';
import { applyAggregateToPlan } from './pathProgressAggregate';
import { resolveExecutionStepsLegacy } from './resolveExecutionSteps';

export type CompassCompileContext = {
  hideOptionIds?: Set<string>;
};

function resolveNextFromQuestion(
  node: Extract<PlaybookNode, { kind: 'question' }>,
  answers: Record<string, unknown>,
): string | null {
  for (const opt of node.options) {
    if (!opt.set) continue;
    if (Object.entries(opt.set).every(([k, v]) => answers[k] === v)) return opt.next;
  }
  return null;
}

function walkAnsweredQuestions(playbook: Playbook, state: PlaybookStateV2): string[] {
  const ids: string[] = [];
  let nodeId: string | null = playbook.entryNodeId;
  const guard = 32;

  for (let i = 0; i < guard && nodeId; i += 1) {
    const node = playbook.nodes[nodeId];
    if (!node || node.kind !== 'question') break;
    ids.push(nodeId);
    if (!state.completedNodeIds.includes(nodeId)) break;
    const next = resolveNextFromQuestion(node, state.answers);
    if (!next) break;
    nodeId = next;
  }

  return ids;
}

function nodeTitle(node: PlaybookNode): string {
  if (node.kind === 'question') return node.promptDefault;
  if (node.kind === 'outcome') return node.messageDefault;
  return node.titleDefault ?? node.id;
}

function nodeToPlan(
  node: PlaybookNode,
  phase: PathStepPlan['phase'],
): Omit<PathStepPlan, 'status'> {
  const kind: PathStepKind =
    node.kind === 'verify' ? 'verify' : (node.kind as PathStepKind);

  const base: Omit<PathStepPlan, 'status'> = {
    nodeId: node.id,
    kind,
    phase,
    title: nodeTitle(node),
    help: 'help' in node && node.help ? node.help : [],
    estimatedMin: 'estimatedMin' in node ? node.estimatedMin : undefined,
  };

  if (node.kind === 'task') {
    return {
      ...base,
      mscTaskId: node.mscTaskId,
      resourceActionId: node.resourceActionId,
      verifySpec: node.verify,
    };
  }
  if (node.kind === 'capability') {
    return {
      ...base,
      kind: 'capability',
      taskId: node.taskId,
      capabilitySurface: node.surface ?? 'inline',
      verifySpec: node.verify,
    };
  }
  if (node.kind === 'verify') {
    return { ...base, verifySpec: node.verify };
  }
  if (node.kind === 'action') {
    return { ...base, portId: node.portId };
  }
  if (node.kind === 'recipe') {
    return { ...base, recipeId: node.recipeId, narrativeId: node.narrativeId };
  }
  return base;
}

export function compilePathPlan(
  playbook: Playbook,
  state: PlaybookStateV2,
  ctx: CompassCompileContext = {},
  focusedStepId: string | null = null,
): PathPlanResult {
  const questionIds = walkAnsweredQuestions(playbook, state);
  const currentQ = playbook.nodes[state.currentNodeId];
  if (currentQ?.kind === 'question' && !questionIds.includes(state.currentNodeId)) {
    questionIds.push(state.currentNodeId);
  }

  const discoverSteps: Omit<PathStepPlan, 'status'>[] = questionIds
    .map((id) => playbook.nodes[id])
    .filter((n): n is PlaybookNode => !!n && n.kind === 'question')
    .map((n) => nodeToPlan(n, 'discover'));

  const execIds = resolveExecutionStepsLegacy(playbook, state);
  const execSteps: Omit<PathStepPlan, 'status'>[] = [];
  for (const id of execIds) {
    const node = playbook.nodes[id];
    if (!node) continue;
    if (node.kind === 'task' || node.kind === 'capability' || node.kind === 'verify') {
      execSteps.push(nodeToPlan(node, node.kind === 'verify' ? 'verify' : 'execute'));
    }
    if (node.kind === 'recipe') {
      execSteps.push(nodeToPlan(node, 'execute'));
    }
  }

  if (playbook.id === 'sell-digital-content' && state.answers.siteMode === 'host') {
    const recipe = playbook.nodes.r_host_recipe;
    if (recipe?.kind === 'recipe' && !execSteps.some((s) => s.nodeId === 'r_host_recipe')) {
      execSteps.splice(1, 0, nodeToPlan(recipe, 'execute'));
    }
  }

  const outcomeNode = Object.values(playbook.nodes).find((n) => n.kind === 'outcome');
  const outcomeSteps = outcomeNode ? [nodeToPlan(outcomeNode, 'outcome')] : [];

  const raw = [...discoverSteps, ...execSteps, ...outcomeSteps];
  const focus =
    focusedStepId ??
    (state.currentNodeId && raw.some((s) => s.nodeId === state.currentNodeId)
      ? state.currentNodeId
      : null);

  const withStatus = deriveStepStatuses(raw, state, focus);
  return applyAggregateToPlan(withStatus);
}
