/**
 * @agentstack/hooks - useUsersData
 * AI-First Design: Self-documenting hook for users management
 * 
 * 🤖 AI QUICK START:
 * ```typescript
 * const { data, isLoading } = useUsersData();
 * ```
 */

import { UseQueryResult } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import type { AgentStackSDK } from '@agentstack/sdk';
import { useSDKQuery } from '@agentstack/react';

/**
 * User data structure
 * AI: Main user object
 */
export interface User {
  id: number;
  username: string;
  email: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  last_login?: string;
  role?: string;
  projects_count?: number;
  metadata?: Record<string, any>;
}

/**
 * User filters
 * AI: Use to filter users
 */
export interface UserFilters {
  search?: string;
  is_active?: boolean;
  role?: string;
  project_id?: number;
  from_date?: string;
  to_date?: string;
}

/**
 * Base hook options
 */
export interface BaseHookOptions {
  refreshInterval?: number;
  enabled?: boolean;
  staleTime?: number;
}

/**
 * Hook options for users data
 */
export interface UseUsersDataOptions extends BaseHookOptions {
  filters?: UserFilters;
  project_id?: number;
}

/**
 * Hook result
 */
export interface UseUsersDataResult extends Omit<UseQueryResult<User[], Error>, 'data'> {
  data: User[];
  filters: UserFilters;
  setFilters: (filters: UserFilters) => void;
}

/**
 * useUsersData Hook
 * 
 * Fetches users with optional filtering.
 * Perfect for user management, admin dashboards.
 * 
 * @param options - Hook options including filters
 * @returns Users array with loading and error states
 * 
 * @example
 * ```typescript
 * // All users:
 * const { data } = useUsersData();
 * 
 * // Filter by active:
 * const { data } = useUsersData({
 *   filters: { is_active: true }
 * });
 * 
 * // Filter by project:
 * const { data } = useUsersData({
 *   project_id: 1
 * });
 * 
 * // Custom UI:
 * return (
 *   <table>
 *     {data.map(user => (
 *       <tr key={user.id}>
 *         <td>{user.username}</td>
 *         <td>{user.email}</td>
 *         <td>{user.is_active ? 'Active' : 'Inactive'}</td>
 *       </tr>
 *     ))}
 *   </table>
 * );
 * ```
 * 
 * AI: User management made simple!
 */
export function useUsersData(
  sdk: AgentStackSDK,
  options: UseUsersDataOptions = {}
): UseUsersDataResult {
  const {
    project_id,
    refreshInterval = 60000,
    enabled = true,
    staleTime = 5 * 60 * 1000
  } = options;

  const [filters, setFiltersState] = useState<UserFilters>(() => ({
    ...(options.filters ?? {}),
  }));

  const queryResult = useSDKQuery<User[]>(
    sdk,
    ['users', project_id, filters],
    async (signal) => {
      try {
        const params: Record<string, string | number> = {};
        if (project_id != null) params.project_id = project_id;
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== '') {
            params[key] = value as string | number;
          }
        });
        const response = await sdk.httpClient.get('/users', params, { signal });
        const data = response.data as { users?: User[]; data?: User[] };
        return data?.users || data?.data || [];
      } catch {
        return [];
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
    setFilters: useCallback((next: UserFilters) => {
      setFiltersState(next);
    }, []),
  };
}

/**
 * AI NOTES:
 * 
 * Users data includes:
 * - Basic info (username, email)
 * - Status (is_active)
 * - Timestamps (created_at, updated_at, last_login)
 * - Relations (projects_count)
 * - Metadata (flexible JSON)
 * 
 * Use for:
 * - User management dashboards
 * - Admin panels
 * - Team member lists
 * - Access control
 */

