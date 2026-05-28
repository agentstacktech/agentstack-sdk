import type { PathSessionIndex, Playbook, PlaybookId, PlaybookStateV2 } from '../types/playbookTypes';

export interface IPathStore {
  loadState(userId: string, playbookId: PlaybookId, playbook?: Playbook): PlaybookStateV2 | null;
  saveState(userId: string, playbookId: PlaybookId, state: PlaybookStateV2): void;
  clearState(userId: string, playbookId: PlaybookId): void;
  loadSessionIndex(userId: string): PathSessionIndex;
  touchSessionIndex(
    userId: string,
    entry: PathSessionIndex['sessions'][number],
    activePlaybookId?: PlaybookId | null,
  ): void;
}
