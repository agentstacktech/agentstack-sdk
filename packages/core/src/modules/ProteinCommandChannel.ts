/**
 * Protein command bus — `/commands/*` API via shared HTTPClient (auth, X-Project-ID, retries).
 * Complements Rules Engine `AgentCommand` (`/command`) and high-level `AgentProtein` (`/protein/execute`).
 */

import { HTTPClient } from '../client/http-client';
import {
  buildProteinDeltaExecuteBody,
  type ProteinCommitMode,
  type ProteinDraftDomain,
} from '../protocol/proteinDraft';

/** Request body for POST /commands/execute */
export interface ProteinCommandExecuteRequest {
  command_type: string;
  command_name: string;
  payload: Record<string, unknown>;
  priority?: number;
  timeout_ms?: number;
  retry_count?: number;
}

export interface ProteinBatchCommandRequest {
  commands: ProteinCommandExecuteRequest[];
  execute_parallel?: boolean;
  fail_fast?: boolean;
}

/** R32/R35 — HTTP 200 with ``success: false`` or dirty unflushed must not ACK. */
export function assertProteinCommandResponseOk(data: unknown): void {
  if (data == null || typeof data !== 'object') return;
  const d = data as Record<string, unknown>;
  if (d.success === false) {
    throw new Error(String(d.error ?? 'protein_command_failed'));
  }
  const payload =
    d.result != null && typeof d.result === 'object'
      ? (d.result as Record<string, unknown>)
      : d;
  const mode = String(payload.commit_mode ?? '');
  if (payload.flushed === false && (mode === 'dirty' || payload.dirty === true)) {
    throw new Error('protein_delta_not_flushed');
  }
}

export class ProteinCommandChannel {
  private readonly sessionId: string;

  constructor(private readonly http: HTTPClient) {
    this.sessionId = `sdk_session_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  }

  private supplementalHeaders(): Record<string, string> {
    const h: Record<string, string> = {
      'X-Session-ID': this.sessionId,
      'X-Request-ID': `req_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
    };
    const tok = this.http.getAuthToken();
    if (tok) {
      h['X-User-Token'] = tok;
    }
    return h;
  }

  async executeCommand<T = unknown>(request: ProteinCommandExecuteRequest): Promise<T> {
    const res = await this.http.post<T>('/commands/execute', request, {
      headers: this.supplementalHeaders(),
    });
    assertProteinCommandResponseOk(res.data);
    return res.data;
  }

  /**
   * DNA DELTA via protein bus — supports ``commit_mode`` immediate|dirty|working_set.
   * Genetic: shared.organelles.protein_commit.gen1
   */
  async deltaUpdate<T = unknown>(args: {
    targetEntity: string;
    updates: Record<string, unknown>;
    domain?: ProteinDraftDomain | string;
    commitMode?: ProteinCommitMode;
    opId?: string;
    entityUuid?: string;
    entityId?: string | number;
    projectId?: number;
    userId?: number;
  }): Promise<T> {
    const body = buildProteinDeltaExecuteBody({
      targetEntity: args.targetEntity,
      updates: args.updates,
      domain: (args.domain || 'config') as ProteinDraftDomain,
      commitMode: args.commitMode,
      opId: args.opId,
      entityUuid: args.entityUuid,
      entityId: args.entityId,
      projectId: args.projectId,
      userId: args.userId,
    });
    return this.executeCommand<T>(body as ProteinCommandExecuteRequest);
  }

  async executeDNAOperation<T = unknown>(
    entityType: string,
    operation: string,
    data: Record<string, unknown>
  ): Promise<T> {
    const res = await this.http.post<T>(`/commands/dna/${entityType}/${operation}`, data, {
      headers: this.supplementalHeaders(),
    });
    assertProteinCommandResponseOk(res.data);
    return res.data;
  }

  async executeBatchCommands<T = unknown>(request: ProteinBatchCommandRequest): Promise<T> {
    const res = await this.http.post<T>('/commands/batch', request, {
      headers: this.supplementalHeaders(),
    });
    assertProteinCommandResponseOk(res.data);
    return res.data;
  }

  async getEntities<T = unknown>(
    entityType: string,
    filters?: Record<string, unknown>
  ): Promise<T> {
    const res = await this.http.get<T>(`/commands/entities/${entityType}`, filters, {
      headers: this.supplementalHeaders(),
    });
    return res.data;
  }

  async createEntity<T = unknown>(entityType: string, data: Record<string, unknown>): Promise<T> {
    const res = await this.http.post<T>(`/commands/entities/${entityType}`, data, {
      headers: this.supplementalHeaders(),
    });
    assertProteinCommandResponseOk(res.data);
    return res.data;
  }

  async getCommandStatus<T = unknown>(commandUuid: string): Promise<T> {
    const res = await this.http.get<T>(`/commands/status/${commandUuid}`, undefined, {
      headers: this.supplementalHeaders(),
    });
    return res.data;
  }

  async getCommandHistory<T = unknown>(limit = 100, offset = 0): Promise<T> {
    const res = await this.http.get<T>('/commands/history', { limit, offset }, {
      headers: this.supplementalHeaders(),
    });
    return res.data;
  }

  async healthCheck<T = unknown>(): Promise<T> {
    const res = await this.http.get<T>('/commands/health', undefined, {
      headers: this.supplementalHeaders(),
    });
    return res.data;
  }
}
