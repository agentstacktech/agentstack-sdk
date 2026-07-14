/**
 * Chain surface read client — tenant + admin + public grant BFF paths.
 * Gene: `core.economy.agentnet.testnet_plane.gen1`
 */

import type { HTTPClient } from '../../client/http-client';
import { ADMIN_AGENTNET_OPENAPI_PATHS } from '../../generated/admin-agentnet-paths';
import type { AgentcoinChainSurfacePayload } from '../../modules/AgentAdmin';
import { ECONOMY_READ } from '../http/economyHttpOpts';

const PUBLIC_GRANTS_CHAIN_SURFACE = '/public/grants/chain-surface';

export class ChainSurfaceClient {
  constructor(private readonly http: HTTPClient) {}

  /** Project/integrator read (`GET /api/agentnet/chain-surface`). */
  async getChainSurface(opts?: { signal?: AbortSignal }): Promise<AgentcoinChainSurfacePayload> {
    const res = await this.http.get<AgentcoinChainSurfacePayload>('/agentnet/chain-surface', {
      ...ECONOMY_READ,
      skipBatching: true,
      signal: opts?.signal,
    });
    return res.data;
  }

  /** Ecosystem admin (`GET /api/admin/agentnet/chain-surface`). */
  async getAdminChainSurface(opts?: {
    signal?: AbortSignal;
  }): Promise<AgentcoinChainSurfacePayload> {
    const res = await this.http.get<AgentcoinChainSurfacePayload>(
      ADMIN_AGENTNET_OPENAPI_PATHS.chainSurface,
      { skipBatching: true, signal: opts?.signal },
    );
    return res.data;
  }

  /** Public grant reviewer BFF (`GET /api/public/grants/chain-surface`). */
  async getPublicChainSurface(opts?: {
    signal?: AbortSignal;
  }): Promise<AgentcoinChainSurfacePayload> {
    const res = await this.http.get<AgentcoinChainSurfacePayload>(PUBLIC_GRANTS_CHAIN_SURFACE, {
      skipAuthStateCheck: true,
      skipBatching: true,
      signal: opts?.signal,
    });
    return res.data;
  }
}
