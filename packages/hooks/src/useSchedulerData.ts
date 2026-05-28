/**
 * @agentstack/hooks - useSchedulerData
 * AI-First Design: Self-documenting hook for scheduled tasks
 * 
 * 🤖 AI QUICK START:
 * ```typescript
 * const { data, isLoading } = useSchedulerData();
 * ```
 */

import { UseQueryResult } from '@tanstack/react-query';
import type { AgentStackSDK } from '@agentstack/sdk';
import { useSDKQuery } from '@agentstack/react';

/**
 * Scheduled task structure
 * AI: Main task object
 */
export interface ScheduledTask {
  id: number;
  name: string;
  schedule: string;  // Cron expression
  is_active: boolean;
  last_run?: string;
  next_run?: string;
  created_at: string;
  updated_at: string;
  success_count?: number;
  failure_count?: number;
  metadata?: Record<string, any>;
}

/**
 * Task execution record
 * AI: Execution history
 */
export interface TaskExecution {
  id: number;
  task_id: number;
  status: 'success' | 'failure' | 'running';
  started_at: string;
  completed_at?: string;
  duration_ms?: number;
  result?: any;
  error?: string;
}

/**
 * Scheduler filters
 * AI: Use to filter tasks
 */
export interface SchedulerFilters {
  is_active?: boolean;
  status?: 'success' | 'failure' | 'running';
  search?: string;
}

/**
 * Base hook options
 */
export interface BaseHookOptions {
  refreshInterval?: number | false;
  enabled?: boolean;
  staleTime?: number;
}

/**
 * Hook options for scheduler data
 */
export interface UseSchedulerDataOptions extends BaseHookOptions {
  filters?: SchedulerFilters;
  /** When set, requests are scoped with `project_id` (dashboard / project modules). */
  projectId?: number;
}

/**
 * Hook result
 */
export interface UseSchedulerDataResult extends Omit<UseQueryResult<ScheduledTask[], Error>, 'data'> {
  data: ScheduledTask[];
  filters: SchedulerFilters;
}

/**
 * useSchedulerData Hook
 * 
 * Fetches scheduled tasks with optional filtering.
 * Perfect for task automation and monitoring.
 * 
 * 🤖 AI NOTE: Pass SDK instance from useSDK()
 * 
 * @param sdk - AgentStack SDK instance
 * @param options - Hook options including filters
 * @returns Tasks array with loading and error states
 * 
 * @example
 * ```typescript
 * import { useSDK } from '@/lib/react-sdk-provider';
 * 
 * const sdk = useSDK();
 * 
 * // All tasks:
 * const { data } = useSchedulerData(sdk);
 * 
 * // Filter by active:
 * const { data } = useSchedulerData(sdk, {
 *   filters: { is_active: true }
 * });
 * 
 * // Custom UI:
 * return (
 *   <div>
 *     {data.map(task => (
 *       <TaskCard key={task.id}>
 *         <div>{task.name}</div>
 *         <div>Schedule: {task.schedule}</div>
 *         <div>Next run: {task.next_run}</div>
 *       </TaskCard>
 *     ))}
 *   </div>
 * );
 * ```
 * 
 * AI: Task automation made easy!
 */
export function useSchedulerData(
  sdk: AgentStackSDK,
  options: UseSchedulerDataOptions = {}
): UseSchedulerDataResult {
  const {
    filters = {},
    projectId,
    refreshInterval = 30000,  // 30 seconds for scheduler
    enabled = true,
    staleTime = 60000
  } = options;

  const queryResult = useSDKQuery<ScheduledTask[]>(
    sdk,
    ['scheduler-tasks', projectId, filters],
    async (signal) => {
      try {
        const params = Object.entries(filters)
          .filter(([_, value]) => value !== undefined && value !== '')
          .reduce<Record<string, unknown>>(
            (acc, [key, value]) => ({ ...acc, [key]: value }),
            {}
          );

        if (projectId != null) {
          params.project_id = projectId;
        }

        const response = await sdk.httpClient.get('/scheduler/tasks', params, { signal });
        return response.data?.tasks || response.data || [];
      } catch (error: unknown) {
        const err = error as { status?: number };
        if (err.status === 404 || err.status === 401) {
          console.warn('⏰ Scheduler service not available - graceful empty response');
          return [];
        }
        throw error;
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
    data: queryResult.data || [],
    filters
  };
}

/**
 * AI NOTES:
 * 
 * Scheduler tasks enable:
 * - Automated jobs (cron-like)
 * - Recurring tasks
 * - Background processing
 * - Scheduled reports
 * 
 * Common schedules:
 * - "0 0 * * *" - Daily at midnight
 * - "0 * * * *" - Every hour
 * - "*'/'15 * * * *" - Every 15 minutes
 * 
 * Use for:
 * - Automated backups
 * - Report generation
 * - Data cleanup
 * - Notifications
 */

