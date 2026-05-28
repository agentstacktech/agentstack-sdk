/**
 * @agentstack/hooks - useSecurityData
 * AI-First Design: Self-documenting hook for security events
 * 
 * 🤖 AI QUICK START:
 * ```typescript
 * const { data, isLoading, error } = useSecurityData();
 * ```
 */

import { UseQueryResult } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import type { AgentStackSDK } from '@agentstack/sdk';
import { useSDKQuery } from '@agentstack/react';
import type {
  SecurityEvent,
  SecurityFilters,
  BaseHookOptions,
} from './types';

/**
 * Hook options for security data
 * AI: Combine filters with base options
 */
export interface UseSecurityDataOptions extends BaseHookOptions {
  filters?: SecurityFilters;
}

/**
 * Hook result
 * AI: Standard React Query result + custom fields
 */
export interface UseSecurityDataResult extends Omit<UseQueryResult<SecurityEvent[], Error>, 'data'> {
  /**
   * Security events array
   * AI: Always an array, never undefined
   */
  data: SecurityEvent[];
  
  /**
   * Current filters
   * AI: Use to display active filters in UI
   */
  filters: SecurityFilters;
  
  /**
   * Update filters
   * AI: Triggers re-fetch with new filters
   */
  setFilters: (filters: SecurityFilters) => void;
}

/**
 * useSecurityData Hook
 * 
 * Fetches security events with optional filtering.
 * Uses React Query for caching, auto-refresh, and error handling.
 * 
 * 🤖 AI NOTE: Pass SDK instance from useSDK()
 * 
 * @param sdk - AgentStack SDK instance
 * @param options - Hook options including filters and refresh settings
 * @returns Security events data with loading and error states
 * 
 * @example
 * ```typescript
 * import { useSDK } from '@agentstack/react'; // or your app's SDKProvider
 * 
 * const sdk = useSDK();
 * const { data, isLoading } = useSecurityData(sdk);
 * 
 * // With filters:
 * const { data } = useSecurityData(sdk, {
 *   filters: { severity: 'critical' }
 * });
 * 
 * // Custom UI:
 * return (
 *   <div>
 *     {data.map(event => (
 *       <SecurityCard key={event.id} {...event} />
 *     ))}
 *   </div>
 * );
 * ```
 * 
 * AI: This hook handles ALL data fetching logic.
 * You only need to render the UI!
 */
export function useSecurityData(
  sdk: AgentStackSDK,
  options: UseSecurityDataOptions = {}
): UseSecurityDataResult {
  const {
    refreshInterval = 60000,  // 1 minute default
    enabled = true,
    staleTime = 5 * 60 * 1000  // 5 minutes
  } = options;

  const [filters, setFiltersState] = useState<SecurityFilters>(() => ({
    ...(options.filters ?? {}),
  }));

  const queryResult = useSDKQuery<SecurityEvent[]>(
    sdk,
    ['security-events', filters],
    async (signal) => {
      try {
        const params = Object.entries(filters)
          .filter(([_, value]) => value !== undefined && value !== '')
          .reduce<Record<string, unknown>>(
            (acc, [key, value]) => ({ ...acc, [key]: value }),
            {}
          );

        const response = await sdk.httpClient.get('/security/events', params, {
          signal,
        });
        return response.data?.events || response.data || [];
      } catch (error: unknown) {
        const err = error as { status?: number };
        if (err.status === 404) {
          console.warn('🛡️ Security service not available - graceful empty response');
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
  
  // Return with enhancements
  return {
    ...queryResult,
    data: queryResult.data || [],  // Never undefined
    filters,
    setFilters: useCallback((next: SecurityFilters) => {
      setFiltersState(next);
    }, []),
  };
}

/**
 * AI NOTES:
 * 
 * 1. This hook returns SecurityEvent[] - ALWAYS an array!
 * 2. Use isLoading to show loading state
 * 3. Use error to show error state
 * 4. Auto-refresh is built-in
 * 5. React Query handles caching automatically
 * 
 * PATTERN:
 * const { data, isLoading, error } = useSecurityData()
 * if (isLoading) return <Loading />
 * if (error) return <Error />
 * return <UI data={data} />
 */

