import { compilePathPlan } from '../domain/compilePathPlan';
import { syncCurrentNodeId } from '../domain/syncCurrentNodeId';
import type {
  Playbook,
  PlaybookEvent,
  PlaybookStateV2,
  StepProgressEntry,
} from '../types/playbookTypes';
import type { StepStatus } from '../types/pathStepStatus';

export type PathRuntimeContext = {
  hideOptionIds?: Set<string>;
};

function nowIso(): string {
  return new Date().toISOString();
}

export function initialPlaybookStateV2(
  playbookId: Playbook['id'],
  projectId: number | null,
  entryNodeId: string,
): PlaybookStateV2 {
  const t = nowIso();
  return {
    schemaVersion: 2,
    playbookId,
    answers: {},
    currentNodeId: entryNodeId,
    completedNodeIds: [],
    projectId,
    stepProgress: {},
    startedAt: t,
    updatedAt: t,
  };
}

function patchStep(
  state: PlaybookStateV2,
  nodeId: string,
  patch: Partial<StepProgressEntry>,
): PlaybookStateV2 {
  const prev = state.stepProgress[nodeId] ?? { status: 'available' as StepStatus };
  return {
    ...state,
    stepProgress: {
      ...state.stepProgress,
      [nodeId]: { ...prev, ...patch, status: patch.status ?? prev.status },
    },
    updatedAt: nowIso(),
  };
}

export function runPathReducer(
  playbook: Playbook,
  state: PlaybookStateV2,
  event: PlaybookEvent,
  _ctx: PathRuntimeContext = {},
): PlaybookStateV2 {
  switch (event.type) {
    case 'RESET':
      return initialPlaybookStateV2(state.playbookId, state.projectId, playbook.entryNodeId);
    case 'SET_PROJECT': {
      let next: PlaybookStateV2 = {
        ...state,
        projectId: event.projectId,
        updatedAt: nowIso(),
      };
      const node = playbook.nodes[state.currentNodeId];
      if (node?.kind === 'question' && node.input === 'project_picker') {
        const visible = filterQuestionOptions(node, _ctx);
        const option = visible[0];
        if (option) {
          const completed = state.completedNodeIds.includes(state.currentNodeId)
            ? state.completedNodeIds
            : [...state.completedNodeIds, state.currentNodeId];
          next = {
            ...next,
            completedNodeIds: completed,
            currentNodeId: option.next,
          };
          next = patchStep(next, state.currentNodeId, {
            status: 'done',
            completedAt: nowIso(),
          });
          const plan = compilePathPlan(playbook, next);
          next = { ...next, currentNodeId: syncCurrentNodeId(plan, next) };
        }
      }
      return next;
    }
    case 'ANSWER': {
      const node = playbook.nodes[event.nodeId];
      if (!node || node.kind !== 'question') return state;
      const option = node.options.find((o) => o.id === event.optionId);
      if (!option) return state;
      const answers = { ...state.answers, ...(option.set ?? {}), ...(event.patch ?? {}) };
      const completed = state.completedNodeIds.includes(event.nodeId)
        ? state.completedNodeIds
        : [...state.completedNodeIds, event.nodeId];
      let next: PlaybookStateV2 = {
        ...state,
        answers,
        completedNodeIds: completed,
        currentNodeId: option.next,
        updatedAt: nowIso(),
      };
      next = patchStep(next, event.nodeId, { status: 'done', completedAt: nowIso() });
      const plan = compilePathPlan(playbook, next);
      return { ...next, currentNodeId: syncCurrentNodeId(plan, next) };
    }
    case 'STEP_FOCUS':
      return { ...state, currentNodeId: event.nodeId, updatedAt: nowIso() };
    case 'STEP_OPEN':
      return patchStep(state, event.nodeId, { status: 'in_progress', lastOpenedAt: nowIso() });
    case 'SKIP':
      return patchStep(
        {
          ...state,
          completedNodeIds: state.completedNodeIds.includes(event.nodeId)
            ? state.completedNodeIds
            : [...state.completedNodeIds, event.nodeId],
        },
        event.nodeId,
        { status: 'skipped', completedAt: nowIso() },
      );
    case 'VERIFY_OK':
    case 'TASK_COMPLETE':
    case 'ACTION_DONE': {
      const completed = state.completedNodeIds.includes(event.nodeId)
        ? state.completedNodeIds
        : [...state.completedNodeIds, event.nodeId];
      const artifact =
        event.type === 'VERIFY_OK'
          ? event.artifact
          : event.type === 'TASK_COMPLETE'
            ? event.artifact
            : undefined;
      const answers =
        event.type === 'TASK_COMPLETE' && artifact && typeof artifact === 'object'
          ? { ...state.answers, ...artifact }
          : state.answers;
      const autoAdvance = playbook.autoAdvance ?? false;
      let next = patchStep(
        { ...state, completedNodeIds: completed, answers },
        event.nodeId,
        {
          status: 'done',
          completedAt: nowIso(),
          artifact,
          awaitingContinue: !autoAdvance,
        },
      );
      if (autoAdvance) {
        const plan = compilePathPlan(playbook, next);
        next = {
          ...next,
          currentNodeId: syncCurrentNodeId(plan, next),
          stepProgress: {
            ...next.stepProgress,
            [event.nodeId]: {
              ...next.stepProgress[event.nodeId],
              awaitingContinue: false,
            },
          },
        };
      }
      return next;
    }
    case 'STEP_CONTINUE': {
      const plan = compilePathPlan(playbook, state);
      const nextNodeId = syncCurrentNodeId(plan, state);
      let next = patchStep(state, state.currentNodeId, { awaitingContinue: false });
      return { ...next, currentNodeId: nextNodeId, updatedAt: nowIso() };
    }
    case 'ADVANCE':
    default:
      return state;
  }
}

export function filterQuestionOptions(
  node: Extract<Playbook['nodes'][string], { kind: 'question' }>,
  ctx: PathRuntimeContext,
): typeof node.options {
  const hide = ctx.hideOptionIds ?? new Set<string>();
  return node.options.filter((o) => !hide.has(o.id));
}

export function getCurrentNode(playbook: Playbook, state: PlaybookStateV2) {
  return playbook.nodes[state.currentNodeId] ?? null;
}

export function isPlaybookQuestionPhase(state: PlaybookStateV2, playbook: Playbook): boolean {
  const node = getCurrentNode(playbook, state);
  return node?.kind === 'question';
}
