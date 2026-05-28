/**
 * @agentstack/hooks - useAuditData
 * AI-First Design: Self-documenting hook for audit logs
 * 
 * 🤖 AI QUICK START:
 * ```typescript
 * const { data, isLoading } = useAuditData();
 * ```
 */

import { UseQueryResult } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import type { AgentStackSDK } from '@agentstack/sdk';
import { useSDKQuery } from '@agentstack/react';
import type { AuditLog, AuditFilters, BaseHookOptions } from './types';

/**
 * Hook options for audit data
 */
export interface UseAuditDataOptions extends BaseHookOptions {
  filters?: AuditFilters;
}

/**
 * Hook result
 */
export interface UseAuditDataResult extends Omit<UseQueryResult<AuditLog[], Error>, 'data'> {
  data: AuditLog[];
  filters: AuditFilters;
  setFilters: (filters: AuditFilters) => void;
}

/**
 * useAuditData Hook
 * 
 * Fetches audit logs with optional filtering.
 * Perfect for compliance, security audits, and activity tracking.
 * 
 * 🤖 AI NOTE: Pass SDK instance from useSDK()
 * 
 * @param sdk - AgentStack SDK instance
 * @param options - Hook options including filters
 * @returns Audit logs with loading and error states
 * 
 * @example
 * ```typescript
 * import { useSDK } from '@agentstack/react'; // or your app's SDKProvider
 * 
 * const sdk = useSDK();
 * 
 * // All logs:
 * const { data } = useAuditData(sdk);
 * 
 * // Filter by action:
 * const { data } = useAuditData(sdk, {
 *   filters: { action: 'delete' }
 * });
 * 
 * // Filter by resource:
 * const { data } = useAuditData(sdk, {
 *   filters: { resource_type: 'project' }
 * });
 * 
 * // Custom UI:
 * return (
 *   <table>
 *     {data.map(log => (
 *       <tr key={log.id}>
 *         <td>{log.action}</td>
 *         <td>{log.resource_type}</td>
 *         <td>{log.user_email}</td>
 *       </tr>
 *     ))}
 *   </table>
 * );
 * ```
 * 
 * AI: Audit logs are critical for compliance.
 * This hook handles all fetching and caching!
 */
export function useAuditData(
  sdk: AgentStackSDK,
  options: UseAuditDataOptions = {}
): UseAuditDataResult {
  const {
    refreshInterval = 60000,
    enabled = true,
    staleTime = 5 * 60 * 1000
  } = options;

  const [filters, setFiltersState] = useState<AuditFilters>(() => ({
    ...(options.filters ?? {}),
  }));

  const queryResult = useSDKQuery<AuditLog[]>(
    sdk,
    ['audit-logs', filters],
    async (signal) => {
      try {
        const params = Object.entries(filters)
          .filter(([_, value]) => value !== undefined && value !== '')
          .reduce<Record<string, unknown>>(
            (acc, [key, value]) => ({ ...acc, [key]: value }),
            {}
          );

        const response = await sdk.httpClient.get('/audit/logs', params, { signal });
        return response.data?.logs || response.data || [];
      } catch (error: unknown) {
        const err = error as { status?: number };
        if (err.status === 404) {
          console.warn('📋 Audit service not available - graceful empty response');
          return [];
        }
        throw error;
      }
    },
    {
      refetchInterval: refreshInterval,
      enabled,
      staleTime,
    }
  );
  
  return {
    ...queryResult,
    data: queryResult.data || [],
    filters,
    setFilters: useCallback((next: AuditFilters) => {
      setFiltersState(next);
    }, []),
  };
}

/**
 * AI NOTES:
 * 
 * Audit logs track EVERYTHING:
 * - Who did what
 * - When they did it
 * - What changed (old vs new values)
 * - From which IP
 * 
 * Perfect for:
 * - Compliance reports
 * - Security investigations
 * - Activity dashboards
 * - Change tracking
 */

