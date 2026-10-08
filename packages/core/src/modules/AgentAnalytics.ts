/**
 * AgentAnalytics — project analytics + event ingest.
 * Canonical read: getProjectSnapshot (core.analytics.read_model.gen1).
 * Genetic tag: sdk.analytics.snapshot.gen1
 */

import { HTTPClient } from '../client/http-client';

export interface AnalyticsEvent {
  type: string;
  user_id?: number;
  project_id?: number;
  data?: Record<string, any>;
  timestamp?: string;
}

/** @deprecated Prefer ProjectAnalyticsSnapshot from getProjectSnapshot. */
export interface DashboardMetrics {
  total_revenue: {
    value: number;
    change_percentage: number;
    period: string;
  };
  total_transactions: {
    value: number;
    change_percentage: number;
    period: string;
  };
  success_rate: {
    value: number;
    change_percentage: number;
    period: string;
  };
  active_customers: {
    value: number;
    change_percentage: number;
    period: string;
  };
}

/** @deprecated Prefer ProjectAnalyticsSnapshot from getProjectSnapshot. */
export interface UsageStats {
  api_calls: {
    total: number;
    successful: number;
    failed: number;
    by_endpoint: Record<string, number>;
    by_hour: Array<{ hour: string; count: number }>;
  };
  users: {
    total: number;
    active: number;
    new_today: number;
    by_project: Array<{ project_id: number; count: number }>;
  };
  performance: {
    average_response_time: number;
    p95_response_time: number;
    p99_response_time: number;
    error_rate: number;
  };
}

export type AnalyticsPeriod = '7d' | '30d' | '90d' | '6m';

export type AnalyticsSliceName =
  | 'activity'
  | 'finance'
  | 'business'
  | 'crm'
  | 'product_events'
  | 'bots'
  | 'integrations'
  | 'hosting'
  | 'agents'
  | 'commerce';

export interface ProjectAnalyticsSnapshot {
  project_id: number;
  period: AnalyticsPeriod | string;
  as_of: string;
  activity?: Record<string, any>;
  finance?: Record<string, any>;
  business?: Record<string, any>;
  crm?: Record<string, any>;
  product_events?: Record<string, any>;
  bots?: Record<string, any>;
  integrations?: Record<string, any>;
  hosting?: Record<string, any>;
  agents?: Record<string, any>;
  commerce?: Record<string, any>;
  links?: Record<string, string | null | undefined>;
  warnings?: Array<{ code: string; slice: string; message: string }>;
  include?: string[];
}

export interface PortfolioAnalyticsSnapshot {
  period: string;
  as_of: string;
  projects: Array<{
    project_id: number;
    display_name: string;
    profit_cents: number;
    api_events: number;
    api_events_30d?: number;
    open_deals: number;
    warnings?: string[];
  }>;
  truncated?: boolean;
  max_projects?: number;
}

const DEFAULT_INCLUDE: AnalyticsSliceName[] = [
  'activity',
  'finance',
  'product_events',
  'crm',
];

function notImplemented(method: string): never {
  const err = new Error(
    `${method} is not implemented — use getProjectSnapshot() or getMetrics()`,
  ) as Error & { code?: string };
  err.code = 'not_implemented';
  throw err;
}

export class AgentAnalytics {
  private client: HTTPClient;

  constructor(client: HTTPClient) {
    this.client = client;
  }

  /** Canonical project analytics BFF. */
  async getProjectSnapshot(params: {
    project_id: number;
    period?: AnalyticsPeriod;
    include?: AnalyticsSliceName[];
    compare?: 'previous_period';
  }): Promise<ProjectAnalyticsSnapshot> {
    const include = (params.include ?? DEFAULT_INCLUDE).join(',');
    const response = await this.client.get(
      `/projects/${params.project_id}/analytics/snapshot`,
      {
        period: params.period ?? '30d',
        include,
        compare: params.compare ?? 'previous_period',
      },
    );
    const body = response.data;
    return (body?.data ?? body) as ProjectAnalyticsSnapshot;
  }

  /** Cross-project portfolio (max 12). */
  async getPortfolioSnapshot(params?: {
    period?: AnalyticsPeriod;
  }): Promise<PortfolioAnalyticsSnapshot> {
    const response = await this.client.get('/projects/analytics/portfolio', {
      period: params?.period ?? '30d',
    });
    const body = response.data;
    return (body?.data ?? body) as PortfolioAnalyticsSnapshot;
  }

  async trackEvent(event: AnalyticsEvent): Promise<{
    success: boolean;
    event_id: string;
    timestamp: string;
  }> {
    const projectId =
      event.project_id ?? (this.client as any).config?.projectId ?? 0;
    const response = await this.client.post('/analytics/events', event, {
      headers: { 'X-Project-ID': String(projectId) },
    });
    return response.data;
  }

  /** Legacy thin dashboard shell — prefer getProjectSnapshot. */
  async getDashboardMetrics(params?: {
    project_id?: number;
    period?: 'day' | 'week' | 'month' | 'year';
  }): Promise<DashboardMetrics> {
    const projectId =
      params?.project_id ?? (this.client as any).config?.projectId ?? 0;
    const response = await this.client.get('/analytics/dashboard', {
      project_id: projectId,
      period: params?.period || 'week',
    });
    return response.data;
  }

  async getStats(params?: {
    project_id?: number;
    period?: string;
  }): Promise<any> {
    const projectId =
      params?.project_id ?? (this.client as any).config?.projectId ?? 0;
    const response = await this.client.get('/analytics/stats', {
      project_id: projectId,
      ...(params?.period ? { period: params.period } : {}),
    });
    return response.data;
  }

  async getRealtimeMetrics(projectId?: number): Promise<any> {
    const pid = projectId ?? (this.client as any).config?.projectId;
    const response = await this.client.get(
      '/analytics/realtime',
      pid ? { project_id: pid } : undefined,
    );
    return response.data;
  }

  async getMetrics(
    projectId: number,
    params?: { limit?: number; offset?: number; metric_type?: string },
  ): Promise<any> {
    const response = await this.client.get(
      `/analytics/projects/${projectId}/metrics`,
      params,
    );
    return response.data;
  }

  async createMetric(
    projectId: number,
    metric: Record<string, any>,
  ): Promise<any> {
    const response = await this.client.post(
      `/analytics/projects/${projectId}/metrics`,
      metric,
    );
    return response.data;
  }

  /** Thin wrapper over getProjectSnapshot activity slice. */
  async getUsageStats(params?: {
    project_id?: number;
    period?: AnalyticsPeriod;
  }): Promise<any> {
    const projectId =
      params?.project_id ?? (this.client as any).config?.projectId ?? 0;
    const snap = await this.getProjectSnapshot({
      project_id: projectId,
      period: params?.period ?? '30d',
      include: ['activity'],
    });
    const activity = snap.activity || {};
    return {
      usage: activity,
      period: params?.period ?? '30d',
      project_id: projectId,
      deprecated_alias_of: 'analytics.project_snapshot',
    };
  }

  /** @deprecated Use getProjectSnapshot */
  async getPaymentStats(_params?: Record<string, any>): Promise<never> {
    return notImplemented('getPaymentStats');
  }

  /** @deprecated Use getProjectSnapshot */
  async getUserStats(_params?: Record<string, any>): Promise<never> {
    return notImplemented('getUserStats');
  }

  /** Thin wrapper over getProjectSnapshot. */
  async getProjectStats(projectId?: number): Promise<ProjectAnalyticsSnapshot> {
    const pid = projectId ?? (this.client as any).config?.projectId ?? 0;
    return this.getProjectSnapshot({ project_id: pid });
  }

  /** @deprecated */
  async getTopEvents(_params?: Record<string, any>): Promise<never> {
    return notImplemented('getTopEvents');
  }

  /** @deprecated */
  async getConversionFunnel(_params?: Record<string, any>): Promise<never> {
    return notImplemented('getConversionFunnel');
  }

  /** @deprecated */
  async createCustomReport(_report: Record<string, any>): Promise<never> {
    return notImplemented('createCustomReport');
  }

  /** @deprecated */
  async getCustomReports(): Promise<never> {
    return notImplemented('getCustomReports');
  }

  /** @deprecated */
  async runCustomReport(_id: string, _params?: Record<string, any>): Promise<never> {
    return notImplemented('runCustomReport');
  }

  /** @deprecated */
  async getReportResult(_id: string): Promise<never> {
    return notImplemented('getReportResult');
  }

  /** @deprecated */
  async deleteCustomReport(_id: string): Promise<never> {
    return notImplemented('deleteCustomReport');
  }

  /** @deprecated Prefer getProjectSnapshot; export plane not shipped. */
  async exportData(_data: Record<string, any>): Promise<never> {
    return notImplemented('exportData');
  }

  /** @deprecated Alias of exportData (react hook / docs BC). */
  async exportAnalytics(data: Record<string, any>): Promise<never> {
    return this.exportData(data);
  }

  /** @deprecated */
  async getExportStatus(_id: string): Promise<never> {
    return notImplemented('getExportStatus');
  }

  /** @deprecated Alias of getRealtimeMetrics (camelCase BC). */
  async getRealTimeMetrics(projectId?: number): Promise<any> {
    return this.getRealtimeMetrics(projectId);
  }

  /** @deprecated */
  async getAlerts(_params?: Record<string, any>): Promise<never> {
    return notImplemented('getAlerts');
  }

  /** @deprecated */
  async createAlert(_alert: Record<string, any>): Promise<never> {
    return notImplemented('createAlert');
  }

  /** Revenue series — prefer getProjectSnapshot finance.monthly_revenue */
  async getRevenueChart(params?: {
    project_id?: number;
    period?: string;
  }): Promise<any> {
    const projectId =
      params?.project_id ?? (this.client as any).config?.projectId ?? 0;
    if (!projectId) {
      return { daily: [], monthly: [] };
    }
    const snap = await this.getProjectSnapshot({
      project_id: projectId,
      period: (params?.period as AnalyticsPeriod) || '30d',
      include: ['finance'],
    });
    const monthly = snap.finance?.monthly_revenue || [];
    const daily = (snap as any).series || [];
    return {
      daily,
      monthly,
      total_revenue: (snap.finance?.total_received_cents || 0) / 100,
    };
  }
}
