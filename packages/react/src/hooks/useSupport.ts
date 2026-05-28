/**
 * Project support — ``sdk.support`` facade + TanStack query helpers.
 *
 * Genetic tag: ``sdk.support.gen2``
 */

import { useMemo } from 'react';
import type { AgentSupport } from '@agentstack/sdk';
import type { SupportProjectSearchResult } from '@agentstack/sdk';
import { useSDKInstance } from '../context/SDKContext';
import { useSDKQuery, type SDKQueryOptions } from './useSDKQuery';

/** Returns the shared ``AgentSupport`` facade (same instance as ``sdk.support`` / ``sdk.platform.support``). */
export function useSupport(): AgentSupport {
  const sdk = useSDKInstance();
  return useMemo(() => sdk.support, [sdk]);
}

export type SupportEligibilityResponse = { projects: Array<Record<string, unknown>> };

/** Directory search — ``GET /api/support/projects/search``. */
export function useSupportProjectSearch(
  q: string | undefined,
  limit = 24,
  options?: SDKQueryOptions<{ projects?: SupportProjectSearchResult[] }>
) {
  const sdk = useSDKInstance();
  const trimmed = (q ?? '').trim();
  return useSDKQuery(
    sdk,
    ['support', 'project-search', trimmed, limit] as const,
    async () => sdk.support.searchProjects({ q: trimmed, limit }),
    {
      enabled: Boolean(sdk.support) && (options?.enabled !== false),
      staleTime: 20_000,
      ...options,
    }
  );
}

/** Batch eligibility — ``GET /api/support/eligibility``. */
export function useSupportEligibility(
  projectIds: number[] | undefined,
  options?: SDKQueryOptions<SupportEligibilityResponse>
) {
  const sdk = useSDKInstance();
  const sortedKey =
    projectIds?.length ?
      [...new Set(projectIds.filter((n) => Number.isFinite(n) && n > 0))].sort((a, b) => a - b).join(',')
    : '';
  return useSDKQuery(
    sdk,
    ['support', 'eligibility', sortedKey] as const,
    async () => {
      const ids =
        projectIds?.filter((n) => Number.isFinite(n) && n > 0).map((n) => Number(n)) ?? [];
      if (ids.length === 0) return { projects: [] };
      return sdk.support.getEligibility({ project_ids: ids }) as Promise<SupportEligibilityResponse>;
    },
    {
      enabled: Boolean(sortedKey && sdk.support) && (options?.enabled !== false),
      staleTime: 15_000,
      ...options,
    }
  );
}

export type SupportInboxFilters = {
  /** Comma-separated ticket statuses (server ``status`` query). */
  status?: string;
  assignee_user_id?: number;
  limit?: number;
};

/** Staff inbox — ``GET /api/support/inbox``. */
export function useSupportInbox(
  projectId: number | undefined,
  filters: SupportInboxFilters = {},
  options?: SDKQueryOptions<Record<string, unknown>>
) {
  const sdk = useSDKInstance();
  const { status = '', assignee_user_id, limit = 80 } = filters;
  const aid = assignee_user_id;
  return useSDKQuery(
    sdk,
    ['support', 'inbox', projectId ?? 0, status, aid ?? '', limit] as const,
    async () => {
      if (!projectId || projectId <= 0) throw new Error('projectId required');
      const params: Parameters<AgentSupport['getInbox']>[0] = {
        project_id: projectId,
        limit,
      };
      if (status.trim()) params.status = status.trim();
      if (aid != null && Number.isFinite(aid)) params.assignee_user_id = aid;
      return sdk.support.getInbox(params);
    },
    {
      enabled: Boolean(projectId && projectId > 0 && sdk.support) && (options?.enabled !== false),
      staleTime: 12_000,
      ...options,
    }
  );
}
