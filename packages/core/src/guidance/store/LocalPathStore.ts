import type { PathSessionIndex, Playbook, PlaybookId, PlaybookStateV2 } from '../types/playbookTypes';
import type { IPathStore } from './IPathStore';
import { isPlaybookStateV2, migrateV1ToV2, normalizePathState } from './migrateV1ToV2';

const KEY_PREFIX = 'agentstack.compass.path.v2';
const INDEX_SUFFIX = 'index';
const MAX_SESSIONS = 3;

export class LocalPathStore implements IPathStore {
  constructor(private readonly storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> = localStorage) {}

  private stateKey(userId: string, playbookId: PlaybookId): string {
    return `${KEY_PREFIX}.${userId}.${playbookId}`;
  }

  private indexKey(userId: string): string {
    return `${KEY_PREFIX}.${userId}.${INDEX_SUFFIX}`;
  }

  loadState(userId: string, playbookId: PlaybookId, playbook?: Playbook): PlaybookStateV2 | null {
    try {
      const raw = this.storage.getItem(this.stateKey(userId, playbookId));
      if (!raw) return null;
      const parsed = JSON.parse(raw) as unknown;
      if (isPlaybookStateV2(parsed)) {
        return playbook ? normalizePathState(playbook, parsed) : parsed;
      }
      if (playbook && parsed && typeof parsed === 'object' && 'playbookId' in parsed) {
        return normalizePathState(playbook, migrateV1ToV2(playbook, parsed as import('../types/playbookTypes').PlaybookStateV1));
      }
      return null;
    } catch {
      return null;
    }
  }

  saveState(userId: string, playbookId: PlaybookId, state: PlaybookStateV2): void {
    try {
      this.storage.setItem(this.stateKey(userId, playbookId), JSON.stringify(state));
    } catch {
      /* quota */
    }
  }

  clearState(userId: string, playbookId: PlaybookId): void {
    this.storage.removeItem(this.stateKey(userId, playbookId));
  }

  loadSessionIndex(userId: string): PathSessionIndex {
    try {
      const raw = this.storage.getItem(this.indexKey(userId));
      if (!raw) return { activePlaybookId: null, sessions: [] };
      return JSON.parse(raw) as PathSessionIndex;
    } catch {
      return { activePlaybookId: null, sessions: [] };
    }
  }

  touchSessionIndex(
    userId: string,
    entry: PathSessionIndex['sessions'][number],
    activePlaybookId?: PlaybookId | null,
  ): void {
    const prev = this.loadSessionIndex(userId);
    const rest = prev.sessions.filter((s) => s.playbookId !== entry.playbookId);
    const sessions = [entry, ...rest].slice(0, MAX_SESSIONS);
    const index: PathSessionIndex = {
      activePlaybookId: activePlaybookId ?? entry.playbookId,
      sessions,
    };
    try {
      this.storage.setItem(this.indexKey(userId), JSON.stringify(index));
    } catch {
      /* quota */
    }
  }
}
