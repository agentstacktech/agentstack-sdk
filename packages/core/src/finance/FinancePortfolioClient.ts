import type { HTTPClient } from '../client/http-client';
import type { FinanceDashboardBundle, FinancePortfolioSnapshot } from './types';
import { FinanceDashboardBundleSchema } from './schemas/dashboardBundle';
import { unwrapApiData } from './unwrapApiData';

export class FinancePortfolioClient {
  constructor(private readonly http: HTTPClient) {}

  async getPortfolio(projectId: number): Promise<FinancePortfolioSnapshot> {
    const res = await this.http.get<FinancePortfolioSnapshot>(
      `/api/finance/${projectId}/portfolio`,
    );
    return unwrapApiData(res);
  }

  async getActivity(
    projectId: number,
    params?: { cursor?: string; limit?: number; rail?: string; kind?: string },
  ): Promise<{ items: unknown[]; next_cursor?: string | null; total_hint?: number }> {
    const res = await this.http.get<{
      items: unknown[];
      next_cursor?: string | null;
      total_hint?: number;
    }>(`/api/finance/${projectId}/activity`, { params });
    return unwrapApiData(res);
  }

  async getBillingStatus(projectId: number): Promise<Record<string, unknown>> {
    const res = await this.http.get<Record<string, unknown>>(
      `/api/finance/${projectId}/billing-status`,
    );
    return unwrapApiData(res);
  }

  async getDashboardBundle(
    projectId: number,
    params?: { activity_limit?: number },
  ): Promise<FinanceDashboardBundle> {
    const res = await this.http.get<unknown>(`/api/finance/me/dashboard-bundle`, {
      params: { project_id: projectId, ...params },
    });
    const raw = unwrapApiData(res);
    return FinanceDashboardBundleSchema.parse(raw);
  }
}
