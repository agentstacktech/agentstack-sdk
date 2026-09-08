/**
 * Grant OS admin API (`/api/admin/grants/*`) — ecosystem owner only.
 * Gene: `frontend.grants.os.gen1`
 */

import type { HTTPClient } from '../../client/http-client';
import type {
  GrantOsAnchorFields,
  GrantOsAnchorResponse,
  GrantOsApplication,
  GrantOsApplicationDetail,
  GrantOsApplicationPatch,
  GrantOsCatalogPatch,
  GrantOsComposeData,
  GrantOsHubSnapshot,
  GrantOsOpportunityUpsert,
  GrantOsPipelineData,
} from './adminGrantsTypes';

const PREFIX = '/admin/grants';

type ReqOpts = { signal?: AbortSignal };

export class AdminGrantsClient {
  constructor(private readonly http: HTTPClient) {}

  async getHubSnapshot(opts?: ReqOpts): Promise<GrantOsHubSnapshot> {
    const res = await this.http.get<GrantOsHubSnapshot>(`${PREFIX}/hub-snapshot`, {
      skipBatching: true,
      signal: opts?.signal,
    });
    return res.data;
  }

  async getPipeline(opts?: ReqOpts): Promise<GrantOsPipelineData> {
    const res = await this.http.get<GrantOsPipelineData>(`${PREFIX}/pipeline`, {
      skipBatching: true,
      signal: opts?.signal,
    });
    return res.data;
  }

  async getApplicationDetail(appId: string, opts?: ReqOpts): Promise<GrantOsApplicationDetail> {
    const res = await this.http.get<GrantOsApplicationDetail>(
      `${PREFIX}/applications/${encodeURIComponent(appId)}`,
      { skipBatching: true, signal: opts?.signal },
    );
    return res.data;
  }

  async getCompose(programId: string, opts?: ReqOpts): Promise<GrantOsComposeData> {
    const res = await this.http.get<GrantOsComposeData>(
      `${PREFIX}/compose/${encodeURIComponent(programId)}`,
      { skipBatching: true, signal: opts?.signal },
    );
    return res.data;
  }

  async getAnchor(opts?: ReqOpts): Promise<GrantOsAnchorResponse> {
    const res = await this.http.get<GrantOsAnchorResponse>(`${PREFIX}/anchor`, {
      skipBatching: true,
      signal: opts?.signal,
    });
    return res.data;
  }

  async updateAnchor(fields: GrantOsAnchorFields): Promise<GrantOsAnchorResponse> {
    const res = await this.http.put<GrantOsAnchorResponse>(`${PREFIX}/anchor`, fields, {
      skipBatching: true,
    });
    return res.data;
  }

  async seed(): Promise<unknown> {
    const res = await this.http.post(`${PREFIX}/seed`, {}, { skipBatching: true });
    return res.data;
  }

  async rebuildPackets(): Promise<unknown> {
    const res = await this.http.post(`${PREFIX}/packets/rebuild`, {}, { skipBatching: true });
    return res.data;
  }

  async syncAll(): Promise<unknown> {
    const res = await this.http.post(`${PREFIX}/sync-all`, {}, { skipBatching: true });
    return res.data;
  }

  async syncProgram(programId: string): Promise<{ application: GrantOsApplication }> {
    const res = await this.http.post<{ application: GrantOsApplication }>(
      `${PREFIX}/sync/${encodeURIComponent(programId)}`,
      {},
      { skipBatching: true },
    );
    return res.data;
  }

  async monthlyReport(): Promise<unknown> {
    const res = await this.http.post(`${PREFIX}/reports/monthly`, {}, { skipBatching: true });
    return res.data;
  }

  async transition(appId: string, targetStatus: string): Promise<{ application: GrantOsApplication }> {
    const res = await this.http.post<{ application: GrantOsApplication }>(
      `${PREFIX}/applications/${encodeURIComponent(appId)}/transition`,
      { target_status: targetStatus },
      { skipBatching: true },
    );
    return res.data;
  }

  async toggleMilestone(
    appId: string,
    milestoneId: string,
    completed: boolean,
  ): Promise<unknown> {
    const res = await this.http.post(
      `${PREFIX}/applications/${encodeURIComponent(appId)}/milestones/${encodeURIComponent(milestoneId)}`,
      { completed },
      { skipBatching: true },
    );
    return res.data;
  }

  async updateEvidence(
    appId: string,
    body: { video_url?: string; farcaster_url?: string; notes?: string },
  ): Promise<unknown> {
    const res = await this.http.post(
      `${PREFIX}/applications/${encodeURIComponent(appId)}/evidence`,
      body,
      { skipBatching: true },
    );
    return res.data;
  }

  async patchW0(updates: Record<string, string>): Promise<unknown> {
    const res = await this.http.patch(`${PREFIX}/w0`, { updates }, { skipBatching: true });
    return res.data;
  }

  async getW0(opts?: ReqOpts): Promise<{ w0_checklist: Record<string, string> }> {
    const res = await this.http.get<{ w0_checklist: Record<string, string> }>(`${PREFIX}/w0`, {
      skipBatching: true,
      signal: opts?.signal,
    });
    return res.data;
  }

  async getReminders(opts?: ReqOpts): Promise<{
    reminders: Array<{ program_id: string; action: string; due: string }>;
  }> {
    const res = await this.http.get<{
      reminders: Array<{ program_id: string; action: string; due: string }>;
    }>(`${PREFIX}/reminders`, { skipBatching: true, signal: opts?.signal });
    return res.data;
  }

  async getIntegrity(opts?: ReqOpts): Promise<{ ok: boolean; failures: string[] }> {
    const res = await this.http.get<{ ok: boolean; failures: string[] }>(`${PREFIX}/integrity`, {
      skipBatching: true,
      signal: opts?.signal,
    });
    return res.data;
  }

  /** Returns raw blob for bundle download. */
  async downloadBundleBlob(programId: string): Promise<Blob> {
    const res = await this.http.post<Blob>(
      `${PREFIX}/bundle/${encodeURIComponent(programId)}`,
      {},
      {
        skipBatching: true,
        responseType: 'blob',
      },
    );
    return res.data;
  }

  async listCatalog(opts?: ReqOpts): Promise<{ programs: Record<string, unknown>[]; count: number }> {
    const res = await this.http.get<{ programs: Record<string, unknown>[]; count: number }>(
      `${PREFIX}/catalog`,
      { skipBatching: true, signal: opts?.signal },
    );
    return res.data;
  }

  async getCatalogProgram(
    programId: string,
    opts?: ReqOpts,
  ): Promise<{ program: Record<string, unknown> }> {
    const res = await this.http.get<{ program: Record<string, unknown> }>(
      `${PREFIX}/catalog/${encodeURIComponent(programId)}`,
      { skipBatching: true, signal: opts?.signal },
    );
    return res.data;
  }

  async upsertCatalogProgram(
    programId: string,
    patch: GrantOsCatalogPatch,
  ): Promise<{ program: Record<string, unknown> }> {
    const res = await this.http.put<{ program: Record<string, unknown> }>(
      `${PREFIX}/catalog/${encodeURIComponent(programId)}`,
      patch,
      { skipBatching: true },
    );
    return res.data;
  }

  async patchApplication(
    appId: string,
    patch: GrantOsApplicationPatch,
  ): Promise<{ application: GrantOsApplication }> {
    const res = await this.http.patch<{ application: GrantOsApplication }>(
      `${PREFIX}/applications/${encodeURIComponent(appId)}`,
      patch,
      { skipBatching: true },
    );
    return res.data;
  }

  async upsertOpportunity(
    body: GrantOsOpportunityUpsert,
  ): Promise<{ program: Record<string, unknown>; application: GrantOsApplication | null }> {
    const res = await this.http.post<{
      program: Record<string, unknown>;
      application: GrantOsApplication | null;
    }>(`${PREFIX}/opportunity`, body, { skipBatching: true });
    return res.data;
  }
}
