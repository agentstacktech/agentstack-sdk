import type { HTTPClient } from '../client/http-client';
import type { EnergyBalance, EnergyPacksMap } from './types';

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
}
