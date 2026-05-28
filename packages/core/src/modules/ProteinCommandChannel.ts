/**
 * Protein command bus — `/commands/*` API via shared HTTPClient (auth, X-Project-ID, retries).
 * Complements Rules Engine `AgentCommand` (`/command`) and high-level `AgentProtein` (`/protein/execute`).
 */

import { HTTPClient } from '../client/http-client';

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
    return res.data;
  }

  async executeDNAOperation<T = unknown>(
    entityType: string,
    operation: string,
    data: Record<string, unknown>
  ): Promise<T> {
    const res = await this.http.post<T>(`/commands/dna/${entityType}/${operation}`, data, {
      headers: this.supplementalHeaders(),
    });
    return res.data;
  }

  async executeBatchCommands<T = unknown>(request: ProteinBatchCommandRequest): Promise<T> {
    const res = await this.http.post<T>('/commands/batch', request, {
      headers: this.supplementalHeaders(),
    });
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
