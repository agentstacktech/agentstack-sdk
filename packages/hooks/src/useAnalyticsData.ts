/**
 * @agentstack/hooks - useAnalyticsData
 * AI-First Design: Self-documenting hook for analytics metrics
 * 
 * 🤖 AI QUICK START:
 * ```typescript
 * const { data, isLoading } = useAnalyticsData({ period: '7d' });
 * ```
 */

import { UseQueryResult } from '@tanstack/react-query';
import type { AgentStackSDK } from '@agentstack/sdk';
import { useSDKQuery } from '@agentstack/react';
import type {
  AnalyticsMetrics,
  AnalyticsOptions,
  BaseHookOptions,
} from './types';

/**
 * Hook options for analytics data
 */
export interface UseAnalyticsDataOptions extends BaseHookOptions, AnalyticsOptions {}

/**
 * Hook result
 */
export interface UseAnalyticsDataResult extends Omit<UseQueryResult<AnalyticsMetrics, Error>, 'data'> {
  data: AnalyticsMetrics | null;
  period: string;
}

/**
 * useAnalyticsData Hook
 * 
 * Fetches analytics metrics for dashboards.
 * Provides key business and technical metrics.
 * 
 * @param options - Hook options including time period
 * @returns Analytics metrics with loading state
 * 
 * @example
 * ```typescript
 * // Last 7 days:
 * const { data } = useAnalyticsData({ period: '7d' });
 * 
 * // Display metrics:
 * if (data) {
 *   return (
 *     <div>
 *       <MetricCard 
 *         title="Total Users" 
 *         value={data.totalUsers} 
 *       />
 *       <MetricCard 
 *         title="API Calls" 
 *         value={data.apiCalls} 
 *       />
 *       <MetricCard 
 *         title="Error Rate" 
 *         value={`${data.errorRate}%`} 
 *       />
 *     </div>
 *   );
 * }
 * ```
 * 
 * AI: Perfect for admin dashboards and monitoring!
 */
const EMPTY_METRICS: AnalyticsMetrics = {
  totalUsers: 0,
  activeUsers: 0,
  totalProjects: 0,
  activeProjects: 0,
  apiCalls: 0,
  errorRate: 0,
};

export function useAnalyticsData(
  sdk: AgentStackSDK,
  options: UseAnalyticsDataOptions = {}
): UseAnalyticsDataResult {
  const {
    period = '7d',
    project_id,
    refreshInterval = 5 * 60 * 1000,  // 5 minutes for analytics
    enabled = true,
    staleTime = 5 * 60 * 1000
  } = options;

  const queryResult = useSDKQuery<AnalyticsMetrics>(
    sdk,
    ['analytics-metrics', period, project_id],
    async (signal) => {
      try {
        const params: Record<string, string | number> = { period };
        if (project_id != null) params.project_id = project_id;
        const response = await sdk.httpClient.get('/analytics/dashboard', params, {
          signal,
        });
        const body = response.data as { data?: AnalyticsMetrics } & AnalyticsMetrics;
        return body.data ?? body ?? EMPTY_METRICS;
      } catch {
        return EMPTY_METRICS;
      }
    },
    {
      refetchInterval: refreshInterval === false ? false : refreshInterval,
      enabled,
      staleTime,
    }
  );
  
  return {
    ...queryResult,
    data: queryResult.data || null,
    period: period || '7d'
  };
}

/**
 * AI NOTES:
 * 
 * Analytics metrics include:
 * - User metrics (total, active, new)
 * - Project metrics (total, active)
 * - API metrics (calls, response time, errors)
 * - Business metrics (revenue, payments)
 * 
 * Use for:
 * - Admin dashboards
 * - Monitoring
 * - Business intelligence
 * - Performance tracking
 */

