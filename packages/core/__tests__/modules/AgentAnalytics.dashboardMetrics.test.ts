/**
 * Unit: dashboard metrics request uses explicit project_id param and HTTP client config fallback.
 */

import { AgentAnalytics } from '../../src/modules/AgentAnalytics';

describe('AgentAnalytics.getDashboardMetrics project_id', () => {
  it('prefers params.project_id over client config', async () => {
    const calls: any[] = [];
    const client = {
      config: { projectId: 1 },
      get: jest.fn(async (path: string, params: Record<string, unknown>) => {
        calls.push({ path, params });
        return { data: { ok: true } };
      }),
    };
    const analytics = new AgentAnalytics(client as any);
    await analytics.getDashboardMetrics({ project_id: 42, period: 'week' });
    expect(client.get).toHaveBeenCalledWith('/analytics/dashboard', {
      project_id: 42,
      period: 'week',
    });
  });

  it('falls back to client config projectId when param omitted', async () => {
    const client = {
      config: { projectId: 7 },
      get: jest.fn(async () => ({ data: {} })),
    };
    const analytics = new AgentAnalytics(client as any);
    await analytics.getDashboardMetrics({ period: 'day' });
    expect(client.get).toHaveBeenCalledWith('/analytics/dashboard', {
      project_id: 7,
      period: 'day',
    });
  });
});
