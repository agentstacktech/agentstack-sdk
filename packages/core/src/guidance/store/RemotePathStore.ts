import type { HTTPClient } from '../../client/http-client';
import type { IPathStore } from './IPathStore';
import type { PathSessionIndex, PlaybookId, PlaybookStateV2 } from '../types/playbookTypes';

const DEPRECATED_MSG =
  'RemotePathStore load/save is deprecated — use GuidanceClient via sdk.platform.guidance.forProject(id) or frontend pathServerSync.ts';

/**
 * Server-backed path store (`sdk.guidance.gen1` P2).
 * @deprecated Prefer `GuidanceClient` + `pathServerSync` in the SPA shell.
 */
export class RemotePathStore implements IPathStore {
  constructor(
    private readonly http: HTTPClient,
    private readonly projectId: number,
  ) {}

  loadState(_userId: string, _playbookId: PlaybookId, _playbook?: import('../types/playbookTypes').Playbook): PlaybookStateV2 | null {
    throw new Error(DEPRECATED_MSG);
  }

  saveState(_userId: string, _playbookId: PlaybookId, _state: PlaybookStateV2): void {
    throw new Error(DEPRECATED_MSG);
  }

  clearState(_userId: string, _playbookId: PlaybookId): void {
    throw new Error(DEPRECATED_MSG);
  }

  loadSessionIndex(_userId: string): PathSessionIndex {
    return { activePlaybookId: null, sessions: [] };
  }

  touchSessionIndex(_userId: string, _entry: PathSessionIndex['sessions'][number]): void {
    void this.http;
    void this.projectId;
  }

  /** Active sessions from user ``data.guidance`` via REST (8DNA-backed). */
  async fetchActiveSessions(_userId: string): Promise<PathSessionIndex['sessions']> {
    const res = await this.http.get<
      Array<{
        playbook_id: string;
        percent: number;
        state?: { current_node_id?: string };
      }>
    >(`/api/projects/${this.projectId}/guidance/sessions/active`);
    const rows = Array.isArray(res.data) ? res.data : [];
    return rows.map((row) => ({
      playbookId: row.playbook_id as PlaybookId,
      percent: row.percent ?? 0,
      currentStepId: row.state?.current_node_id ?? '',
      title: row.playbook_id,
      updatedAt: new Date().toISOString(),
    }));
  }

  /** Path hydrate BFF — session + capability_matrix_keys (`docs/perf/PATH_HYDRATE_BFF.md`). */
  async hydrateSession(sessionId: string): Promise<{
    session: Record<string, unknown>;
    capability_matrix_keys: string[];
  } | null> {
    const res = await this.http.get<{
      session?: Record<string, unknown>;
      capability_matrix_keys?: string[];
    }>(
      `/api/projects/${this.projectId}/guidance/sessions/${encodeURIComponent(sessionId)}/hydrate`,
    );
    if (!res.data?.session) return null;
    return {
      session: res.data.session,
      capability_matrix_keys: res.data.capability_matrix_keys ?? [],
    };
  }
}
