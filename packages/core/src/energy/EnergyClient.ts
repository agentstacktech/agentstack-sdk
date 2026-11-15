import type { HTTPClient } from '../client/http-client';
import type {
  EnergyBalance,
  EnergyPacksMap,
  LlmProvidersCatalog,
} from './types';

export class EnergyClient {
  constructor(private readonly http: HTTPClient) {}

  async getBalance(opts?: { projectId?: number; signal?: AbortSignal }): Promise<EnergyBalance> {
    const params: Record<string, string | number> = {};
    if (opts?.projectId != null) {
      params.project_id = opts.projectId;
    }
    const res = await this.http.get('/energy/balance', params, {
      skipCache: true,
      signal: opts?.signal,
    });
    const data = (res as { data?: EnergyBalance }).data ?? (res as unknown as EnergyBalance);
    return data;
  }

  async listPacks(signal?: AbortSignal): Promise<EnergyPacksMap> {
    const res = await this.http.get('/energy/packs', undefined, {
      skipCache: true,
      signal,
    });
    const data = (res as { data?: EnergyPacksMap }).data ?? (res as unknown as EnergyPacksMap);
    return data;
  }

  /**
   * Agents LLM catalog — same SoT as MCP ``ai.providers.list`` items.
   * Gene: ``core.llm.partner_providers.gen1`` · ``sdk.energy.gen1``.
   */
  async listLlmProviders(opts?: {
    signal?: AbortSignal;
    projectId?: number;
  }): Promise<LlmProvidersCatalog> {
    const params: Record<string, string | number> = {};
    if (opts?.projectId != null) {
      params.project_id = opts.projectId;
    }
    const res = await this.http.get('/agents/llm-providers', params, {
      skipCache: true,
      signal: opts?.signal,
    });
    const body = (res as { data?: LlmProvidersCatalog }).data ?? (res as unknown as LlmProvidersCatalog);
    return {
      providers: Array.isArray(body?.providers) ? body.providers : [],
      items: Array.isArray(body?.items) ? body.items : [],
      free_calls: body?.free_calls,
    };
  }
}
