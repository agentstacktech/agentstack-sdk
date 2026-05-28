import { initialPlaybookStateV2 } from '../engine/runPathReducer';
import type { Playbook, PlaybookStateV1, PlaybookStateV2 } from '../types/playbookTypes';

export function isPlaybookStateV2(raw: unknown): raw is PlaybookStateV2 {
  return (
    typeof raw === 'object' &&
    raw != null &&
    (raw as PlaybookStateV2).schemaVersion === 2
  );
}

export function migrateV1ToV2(playbook: Playbook, v1: PlaybookStateV1): PlaybookStateV2 {
  const base = initialPlaybookStateV2(v1.playbookId, v1.projectId, playbook.entryNodeId);
  const stepProgress: PlaybookStateV2['stepProgress'] = {};
  for (const nodeId of v1.completedNodeIds) {
    stepProgress[nodeId] = { status: 'done', completedAt: base.updatedAt };
  }
  return {
    ...base,
    answers: v1.answers,
    currentNodeId: v1.currentNodeId,
    completedNodeIds: v1.completedNodeIds,
    stepProgress,
    startedAt: base.startedAt,
    updatedAt: new Date().toISOString(),
  };
}

export function normalizePathState(playbook: Playbook, state: PlaybookStateV2): PlaybookStateV2 {
  const node = playbook.nodes[state.currentNodeId];
  if (!node) {
    return initialPlaybookStateV2(state.playbookId, state.projectId, playbook.entryNodeId);
  }
  if (node.kind === 'question' && node.options.length === 0) {
    return initialPlaybookStateV2(state.playbookId, state.projectId, playbook.entryNodeId);
  }
  return state;
}
