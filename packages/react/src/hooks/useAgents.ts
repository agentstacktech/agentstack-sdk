/**
 * Agents Fleet — list hook (TanStack Query + sdk.agentsFleet).
 * Query keys: `['agents', projectId]` — align invalidation with app `AGENTS_QUERY_KEY_PREFIXES`.
 */

import type { AgentRowDTO } from '@agentstack/sdk';
import { useSDKInstance } from '../context/SDKContext';
import { useSDKQuery, type SDKQueryOptions } from './useSDKQuery';

export type AgentsListResponse = { success: boolean; agents: AgentRowDTO[] };

export function useAgents(projectId: number | undefined, options?: SDKQueryOptions<AgentsListResponse>) {
  const sdk = useSDKInstance();
  return useSDKQuery<AgentsListResponse>(
    sdk,
    ['agents', projectId],
    async () => {
      if (projectId == null) throw new Error('projectId required');
      return sdk.agentsFleet.list(projectId);
    },
    {
      enabled: Boolean(projectId && projectId > 0),
      staleTime: 15_000,
      ...options,
    },
  );
}
