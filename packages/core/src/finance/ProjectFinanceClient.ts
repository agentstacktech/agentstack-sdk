import type { HTTPClient } from '../client/http-client';
import type {
  ContributeProjectRequest,
  FundProjectRequest,
  ProjectContributionRecord,
  ProjectFinanceSnapshot,
} from './types';
import { unwrapApiData } from './unwrapApiData';

export class ProjectFinanceClient {
  constructor(private readonly http: HTTPClient) {}

  async getProjectPortfolio(projectId: number): Promise<ProjectFinanceSnapshot> {
    const res = await this.http.get<ProjectFinanceSnapshot>(
      `/api/finance/projects/${projectId}/portfolio`,
    );
    return unwrapApiData(res);
  }

  async getCashflow(
    projectId: number,
    params?: { cursor?: string; limit?: number },
  ): Promise<{ items: unknown[]; next_cursor?: string | null }> {
    const res = await this.http.get<{
      items: unknown[];
      next_cursor?: string | null;
    }>(`/api/finance/projects/${projectId}/cashflow`, { params });
    return unwrapApiData(res);
  }

  async getTreasury(projectId: number): Promise<Record<string, unknown>> {
    const res = await this.http.get<Record<string, unknown>>(
      `/api/finance/projects/${projectId}/treasury`,
    );
    return unwrapApiData(res);
  }

  async contributeProject(body: ContributeProjectRequest): Promise<Record<string, unknown>> {
    const { projectId, idempotencyKey, ...rest } = body;
    const res = await this.http.post<Record<string, unknown>>(
      `/api/finance/projects/${projectId}/contribute`,
      { ...rest, idempotency_key: idempotencyKey },
      { headers: { 'Idempotency-Key': idempotencyKey } },
    );
    return unwrapApiData(res);
  }

  async listContributions(
    projectId: number,
    params?: { cursor?: string; limit?: number },
  ): Promise<{ items: ProjectContributionRecord[]; next_cursor?: string | null; meta: Record<string, unknown> }> {
    const res = await this.http.get<{
      items: ProjectContributionRecord[];
      next_cursor?: string | null;
      meta: Record<string, unknown>;
    }>(`/api/finance/projects/${projectId}/contributions`, { params });
    return unwrapApiData(res);
  }

  async contributionsSummary(projectId: number): Promise<Record<string, unknown>> {
    const res = await this.http.get<Record<string, unknown>>(
      `/api/finance/projects/${projectId}/contributions/summary`,
    );
    return unwrapApiData(res);
  }

  async fundProject(body: FundProjectRequest): Promise<Record<string, unknown>> {
    const { projectId, idempotencyKey, ...rest } = body;
    const res = await this.http.post<Record<string, unknown>>(
      `/api/finance/projects/${projectId}/fund`,
      { ...rest, idempotency_key: idempotencyKey },
      { headers: { 'Idempotency-Key': idempotencyKey } },
    );
    return unwrapApiData(res);
  }

  async getProjectsSummary(projectIds: number[]): Promise<{ items: unknown[] }> {
    const res = await this.http.get<{ items: unknown[] }>(
      '/api/finance/me/projects-summary',
      {
        params: { project_ids: projectIds.join(',') },
      },
    );
    return unwrapApiData(res);
  }

  async getMerchantSummary(projectId: number): Promise<Record<string, unknown>> {
    const res = await this.http.get<Record<string, unknown>>(
      `/api/finance/projects/${projectId}/merchant-summary`,
    );
    return unwrapApiData(res);
  }

  async getDashboardBundle(
    projectId: number,
    params?: { activity_limit?: number },
  ): Promise<Record<string, unknown>> {
    const res = await this.http.get<Record<string, unknown>>(
      `/api/finance/projects/${projectId}/dashboard-bundle`,
      { params },
    );
    return unwrapApiData(res);
  }
}
