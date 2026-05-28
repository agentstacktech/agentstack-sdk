/**
 * Headless guidance session hook for tenant apps (`sdk.guidance.gen1` P1.6).
 */
import { useCallback, useMemo, useState } from 'react';
import { compilePathPlan, runPathReducer, type Playbook, type PlaybookEvent, type PlaybookStateV2 } from '../index';
import type { IPathStore } from '../store/IPathStore';
import { initialPlaybookStateV2 } from '../engine/runPathReducer';

export type UseGuidanceSessionOptions = {
  playbook: Playbook;
  userId: string;
  projectId: number | null;
  store: IPathStore;
};

export function useGuidanceSession(opts: UseGuidanceSessionOptions) {
  const { playbook, userId, projectId, store } = opts;
  const [state, setState] = useState<PlaybookStateV2 | null>(
    (): PlaybookStateV2 | null => {
      const saved = store.loadState(userId, playbook.id, playbook);
      return saved ?? initialPlaybookStateV2(playbook.id, projectId, playbook.entryNodeId);
    },
  );

  const plan = useMemo(
    () => (state ? compilePathPlan(playbook, state) : null),
    [playbook, state],
  );

  const dispatch = useCallback(
    (event: PlaybookEvent) => {
      if (!state) return;
      const next = runPathReducer(playbook, state, event);
      setState(next);
      store.saveState(userId, playbook.id, next);
    },
    [playbook, state, store, userId],
  );

  return { state, plan, dispatch };
}
