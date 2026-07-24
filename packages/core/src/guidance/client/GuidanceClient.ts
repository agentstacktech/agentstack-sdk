/**
 * Guidance REST client via HTTPClient (`sdk.guidance.gen1`).
 * Prefer this over raw fetch so hybrid session headers stay centralized.
 */
import type { HTTPClient } from '../../client/http-client';
import {
  rebuildPathStateFromEvents,
  type RebuiltPathState,
} from '../domain/rebuildPathStateFromEvents';

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

export type GuidanceDefinitionDto = {
  id?: string;
  definition_id?: string;
  project_id?: number;
  title?: string;
  definition?: Record<string, unknown>;
  version?: number;
  source?: string;
  updated_at?: string;
};

export type GuidancePathStatusDto = {
  verify?: Record<string, { ok?: boolean; count?: number; reason?: string }>;
  [key: string]: unknown;
};

export type UpsertGuidanceDefinitionInput = {
  title: string;
  definition: Record<string, unknown>;
  version?: number;
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

  /**
   * Thin reconstruct from event log (W9). Prefer live session state when available;
   * use after `GET …/guidance/events` dumps for ops/debug.
   */
  rebuildFromEvents(events: Array<Record<string, unknown>>): RebuiltPathState {
    return rebuildPathStateFromEvents(events);
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

  /** Platform stubs + tenant rows (`GET …/guidance/definitions`). */
  async listDefinitions(): Promise<GuidanceDefinitionDto[]> {
    const res = await this.http.get<GuidanceDefinitionDto[]>(
      `/api/projects/${this.projectId}/guidance/definitions`,
    );
    return Array.isArray(res.data) ? res.data : [];
  }

  /**
   * Upsert tenant path definition (`PUT …/guidance/definitions/{id}`).
   * Body matches UpsertDefinitionBody: definition_id, title, definition, version.
   */
  async upsertDefinition(
    definitionId: string,
    input: UpsertGuidanceDefinitionInput,
  ): Promise<GuidanceDefinitionDto> {
    const res = await this.http.put<GuidanceDefinitionDto>(
      `/api/projects/${this.projectId}/guidance/definitions/${encodeURIComponent(definitionId)}`,
      {
        definition_id: definitionId,
        title: input.title,
        definition: input.definition,
        version: input.version ?? 1,
      },
    );
    return res.data;
  }

  /** Server verify snapshot for SPA runGoalVerify fallback (`GET …/path-status`). */
  async getPathStatus(playbookId?: string): Promise<GuidancePathStatusDto> {
    const q = playbookId ? `?playbook_id=${encodeURIComponent(playbookId)}` : '';
    const res = await this.http.get<GuidancePathStatusDto>(
      `/api/projects/${this.projectId}/guidance/path-status${q}`,
    );
    return res.data ?? {};
  }
}
