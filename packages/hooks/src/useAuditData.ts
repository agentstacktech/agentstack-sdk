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
import { useSDKQuery, stableKeyPart } from '@agentstack/react';
import type { AuditLog, AuditFilters, BaseHookOptions } from './types';

function isAbortError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const name = (err as { name?: string }).name;
  return name === 'AbortError' || (err as { code?: string }).code === 'ABORT_ERR';
}

/**
 * Hook options for audit data
 */
export interface UseAuditDataOptions extends BaseHookOptions {
  filters?: AuditFilters;
  page?: number;
  limit?: number;
}

export interface AuditLogsPage {
  entries: AuditLog[];
  total: number;
  totalPages: number;
  currentPage: number;
  limit: number;
}

export interface UseAuditDataResult extends Omit<UseQueryResult<AuditLogsPage, Error>, 'data'> {
  data: AuditLogsPage;
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
    staleTime = 5 * 60 * 1000,
    page = 1,
    limit = 50,
  } = options;

  const [filters, setFiltersState] = useState<AuditFilters>(() => ({
    ...(options.filters ?? {}),
  }));

  const emptyPage: AuditLogsPage = {
    entries: [],
    total: 0,
    totalPages: 0,
    currentPage: page,
    limit,
  };

  const queryResult = useSDKQuery<AuditLogsPage>(
    sdk,
    ['audit-logs', stableKeyPart(filters), page, limit],
    async (signal) => {
      try {
        const params: Record<string, unknown> = {
          page,
          limit,
          ...Object.entries(filters)
            .filter(([_, value]) => value !== undefined && value !== '')
            .reduce<Record<string, unknown>>(
              (acc, [key, value]) => ({ ...acc, [key]: value }),
              {},
            ),
        };

        const response = await sdk.httpClient.get('/audit/logs', params, {
          signal,
          skipBatching: true,
        });
        const body = response.data ?? {};
        const entries = (body.entries ?? body.logs ?? []) as AuditLog[];
        return {
          entries,
          total: Number(body.total ?? entries.length),
          totalPages: Number(body.totalPages ?? 1),
          currentPage: Number(body.currentPage ?? page),
          limit: Number(body.limit ?? limit),
        };
      } catch (error: unknown) {
        if (isAbortError(error)) throw error;
        const err = error as { status?: number };
        if (err.status === 404) {
          return emptyPage;
        }
        throw error;
      }
    },
    {
      refetchInterval: refreshInterval,
      enabled,
      staleTime,
      retry: (failureCount, error) => !isAbortError(error) && failureCount < 1,
    }
  );
  
  return {
    ...queryResult,
    data: queryResult.data ?? emptyPage,
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

