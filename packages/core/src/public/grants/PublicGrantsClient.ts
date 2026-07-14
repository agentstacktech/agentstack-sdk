/**
 * Public grant reviewer API (`/api/public/grants/*`) — read-only, no admin surface.
 * Gene: `frontend.public.grants_reviewer.gen1`
 */

import type { HTTPClient } from '../../client/http-client';
import type {
  PublicBatchProofPayload,
  PublicChainSurfacePayload,
  PublicGrantsSnapshot,
} from './publicGrantsTypes';

const PREFIX = '/public/grants';

export class PublicGrantsClient {
  constructor(private readonly http: HTTPClient) {}

  async getEvidenceSnapshot(opts?: { signal?: AbortSignal }): Promise<PublicGrantsSnapshot> {
    const res = await this.http.get<PublicGrantsSnapshot>(`${PREFIX}/evidence-snapshot`, {
      skipAuthStateCheck: true,
      skipBatching: true,
      signal: opts?.signal,
    });
    return res.data;
  }

  async getChainSurface(opts?: { signal?: AbortSignal }): Promise<PublicChainSurfacePayload> {
    const res = await this.http.get<PublicChainSurfacePayload>(`${PREFIX}/chain-surface`, {
      skipAuthStateCheck: true,
      skipBatching: true,
      signal: opts?.signal,
    });
    return res.data;
  }

  async getBatchProof(
    batchId: number,
    opts?: { signal?: AbortSignal },
  ): Promise<PublicBatchProofPayload> {
    const res = await this.http.get<PublicBatchProofPayload>(
      `${PREFIX}/batches/${batchId}/proof`,
      {
        skipAuthStateCheck: true,
        skipBatching: true,
        signal: opts?.signal,
      },
    );
    return res.data;
  }

  async getMetrics(opts?: { signal?: AbortSignal }): Promise<Record<string, unknown>> {
    const res = await this.http.get<Record<string, unknown>>(`${PREFIX}/metrics`, {
      skipAuthStateCheck: true,
      skipBatching: true,
      signal: opts?.signal,
    });
    return res.data;
  }
}
