/**
 * Guidance REST client via HTTPClient (`sdk.guidance.gen1`).
 * Prefer this over raw fetch so hybrid session headers stay centralized.
 */
import type { HTTPClient } from '../../client/http-client';
import type { RequestConfig } from '../../types';
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
    private readonly headers?: () => Record<string, string>,
  ) {}

  private withHeaders(config?: Partial<RequestConfig>): Partial<RequestConfig> | undefined {
    if (!this.headers) return config;
    const extra = this.headers();
    return {
      ...config,
      headers: { ...extra, ...(config?.headers ?? {}) },
    };
  }

  private get<T>(url: string, config?: Partial<RequestConfig>) {
    return this.http.get<T>(url, undefined, this.withHeaders(config));
  }

  private post<T>(url: string, body?: unknown, config?: Partial<RequestConfig>) {
    return this.http.post<T>(url, body, this.withHeaders(config));
  }

  private put<T>(url: string, body?: unknown, config?: Partial<RequestConfig>) {
    return this.http.put<T>(url, body, this.withHeaders(config));
  }

  private patch<T>(url: string, body?: unknown, config?: Partial<RequestConfig>) {
    return this.http.patch<T>(url, body, this.withHeaders(config));
  }

  async listActiveSessions(): Promise<GuidanceSessionDto[]> {
    const res = await this.get<GuidanceSessionDto[]>(
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
    const res = await this.post<GuidanceSessionDto>(
      `/api/projects/${this.projectId}/guidance/sessions`,
      { playbook_id: playbookId, initial_state: initialState },
    );
    return res.data;
  }

  async hydrate(sessionId: string): Promise<GuidanceHydrateDto | null> {
    const res = await this.get<GuidanceHydrateDto>(
      `/api/projects/${this.projectId}/guidance/sessions/${encodeURIComponent(sessionId)}/hydrate`,
    );
    return res.data ?? null;
  }

  async patchSession(
    sessionId: string,
    state: Record<string, unknown>,
    percent?: number,
  ): Promise<GuidanceSessionDto | null> {
    const res = await this.patch<GuidanceSessionDto>(
      `/api/projects/${this.projectId}/guidance/sessions/${encodeURIComponent(sessionId)}`,
      { state, percent },
    );
    return res.data ?? null;
  }

  async postEvents(events: Array<Record<string, unknown>>): Promise<void> {
    await this.post(`/api/projects/${this.projectId}/guidance/events`, { events });
  }

  /** Platform stubs + tenant rows (`GET …/guidance/definitions`). */
  async listDefinitions(): Promise<GuidanceDefinitionDto[]> {
    const res = await this.get<GuidanceDefinitionDto[]>(
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
    const res = await this.put<GuidanceDefinitionDto>(
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
    const res = await this.get<GuidancePathStatusDto>(
      `/api/projects/${this.projectId}/guidance/path-status${q}`,
    );
    return res.data ?? {};
  }
}

/** Factory for project-scoped Guidance REST client. */
export function createGuidanceClient(
  http: HTTPClient,
  projectId: number,
  headers?: () => Record<string, string>,
): GuidanceClient {
  return new GuidanceClient(http, projectId, headers);
}
