/**
 * Rebuild path session percent / current node from guidance event log (W9 light).
 * SoT remains reducer + pathStore; this is a thin reconstruct helper for ops / debug.
 */
export type GuidancePathEventLike = {
  type?: string;
  playbook_id?: string;
  playbookId?: string;
  step_id?: string;
  stepId?: string;
  node_id?: string;
  nodeId?: string;
  percent?: number;
  state?: {
    current_node_id?: string;
    completed_node_ids?: string[];
    percent?: number;
  };
};

export type RebuiltPathState = {
  playbookId: string | null;
  currentNodeId: string | null;
  completedNodeIds: string[];
  percent: number;
  eventCount: number;
};

export function rebuildPathStateFromEvents(
  events: readonly GuidancePathEventLike[],
): RebuiltPathState {
  let playbookId: string | null = null;
  let currentNodeId: string | null = null;
  const completed = new Set<string>();
  let percent = 0;

  for (const ev of events) {
    const pb = ev.playbookId ?? ev.playbook_id;
    if (pb) playbookId = pb;
    const step =
      ev.stepId ?? ev.step_id ?? ev.nodeId ?? ev.node_id ?? ev.state?.current_node_id;
    if (step) currentNodeId = step;
    if (ev.state?.completed_node_ids) {
      for (const id of ev.state.completed_node_ids) completed.add(id);
    }
    if (
      ev.type === 'step_done' ||
      ev.type === 'path.step_done' ||
      ev.type === 'TASK_COMPLETE'
    ) {
      if (step) completed.add(step);
    }
    const p = ev.percent ?? ev.state?.percent;
    if (typeof p === 'number' && Number.isFinite(p)) percent = Math.max(percent, p);
  }

  return {
    playbookId,
    currentNodeId,
    completedNodeIds: [...completed],
    percent,
    eventCount: events.length,
  };
}
