/**
 * @agentstack/hooks - useProjectsData
 * AI-First Design: Self-documenting hook for projects management
 * 
 * 🤖 AI QUICK START:
 * ```typescript
 * const { data, isLoading } = useProjectsData();
 * ```
 */

import { UseQueryResult } from '@tanstack/react-query';
import type { AgentStackSDK } from '@agentstack/sdk';
import { useSDKQuery } from '@agentstack/react';

/**
 * Project data structure
 * AI: Main project object
 */
export interface Project {
  id: number;
  name: string;
  description?: string;
  is_active: boolean;
  owner_id: number;
  owner_email?: string;
  created_at: string;
  updated_at: string;
  members_count?: number;
  settings?: Record<string, any>;
  project_data?: Record<string, any>;
  metadata?: Record<string, any>;
}

/**
 * Project filters
 * AI: Use to filter projects
 */
export interface ProjectFilters {
  is_active?: boolean;
  owner_id?: number;
  search?: string;
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
 * Hook options for projects data
 */
export interface UseProjectsDataOptions extends BaseHookOptions {
  filters?: ProjectFilters;
}

/**
 * Hook result
 */
export interface UseProjectsDataResult extends Omit<UseQueryResult<Project[], Error>, 'data'> {
  data: Project[];
  filters: ProjectFilters;
}

/**
 * useProjectsData Hook
 * 
 * Fetches projects with optional filtering.
 * Perfect for project management, dashboards.
 * 
 * @param options - Hook options including filters
 * @returns Projects array with loading and error states
 * 
 * @example
 * ```typescript
 * // All projects:
 * const { data } = useProjectsData();
 * 
 * // Filter by active:
 * const { data } = useProjectsData({
 *   filters: { is_active: true }
 * });
 * 
 * // Custom UI:
 * return (
 *   <div>
 *     {data.map(project => (
 *       <ProjectCard key={project.id}>
 *         <h3>{project.name}</h3>
 *         <p>{project.description}</p>
 *         <span>{project.is_active ? 'Active' : 'Inactive'}</span>
 *       </ProjectCard>
 *     ))}
 *   </div>
 * );
 * ```
 * 
 * AI: Project management made simple!
 */
export function useProjectsData(
  sdk: AgentStackSDK,
  options: UseProjectsDataOptions = {}
): UseProjectsDataResult {
  const {
    filters = {},
    refreshInterval = 60000,
    enabled = true,
    staleTime = 5 * 60 * 1000
  } = options;

  const queryResult = useSDKQuery<Project[]>(
    sdk,
    ['projects', filters],
    async (signal) => {
      try {
        const res = await sdk.api.getProjects(
          filters.is_active !== undefined ? { is_active: filters.is_active } : undefined
        );
        let list = (res.projects || []) as Project[];
        if (filters.search?.trim()) {
          const q = filters.search.trim().toLowerCase();
          list = list.filter(
            (p) =>
              p.name?.toLowerCase().includes(q) ||
              p.description?.toLowerCase().includes(q)
          );
        }
        if (filters.owner_id != null) {
          list = list.filter((p) => p.owner_id === filters.owner_id);
        }
        return list;
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
    filters
  };
}

/**
 * AI NOTES:
 * 
 * Projects are the core organizational unit:
 * - Container for users, data, settings
 * - Workspace for team collaboration
 * - Billing & subscription scope
 * 
 * Use for:
 * - Project dashboards
 * - Project lists
 * - Team management
 * - Multi-project apps
 */

