/**
 * Guidance REST client via HTTPClient (`sdk.guidance.gen1`).
 * Prefer this over raw fetch so hybrid session headers stay centralized.
 */
import type { HTTPClient } from '../../client/http-client';

export type GuidanceSessionDto = {
  id?: string;
  playbook_id?: string;
  project_id?: number;
  user_id?: number;
  percent?: number;
  state?: Record<string, unknown>;
};

export type GuidanceHydrateDto = {
  session: GuidanceSessionDto;
  capability_matrix_keys: string[];
};

export class GuidanceClient {
  constructor(
    private readonly http: HTTPClient,
    private readonly projectId: number,
  ) {}

  async listActiveSessions(): Promise<GuidanceSessionDto[]> {
    const res = await this.http.get<GuidanceSessionDto[]>(
      `/api/projects/${this.projectId}/guidance/sessions/active`,
    );
    return Array.isArray(res.data) ? res.data : [];
  }

  async startSession(
    playbookId: string,
    initialState?: Record<string, unknown>,
  ): Promise<GuidanceSessionDto> {
    const res = await this.http.post<GuidanceSessionDto>(
      `/api/projects/${this.projectId}/guidance/sessions`,
      { playbook_id: playbookId, initial_state: initialState },
    );
    return res.data;
  }

  async hydrate(sessionId: string): Promise<GuidanceHydrateDto | null> {
    const res = await this.http.get<GuidanceHydrateDto>(
      `/api/projects/${this.projectId}/guidance/sessions/${encodeURIComponent(sessionId)}/hydrate`,
    );
    return res.data ?? null;
  }

  async patchSession(
    sessionId: string,
    state: Record<string, unknown>,
    percent?: number,
  ): Promise<GuidanceSessionDto | null> {
    const res = await this.http.patch<GuidanceSessionDto>(
      `/api/projects/${this.projectId}/guidance/sessions/${encodeURIComponent(sessionId)}`,
      { state, percent },
    );
    return res.data ?? null;
  }

  async postEvents(events: Array<Record<string, unknown>>): Promise<void> {
    await this.http.post(`/api/projects/${this.projectId}/guidance/events`, { events });
  }
}
