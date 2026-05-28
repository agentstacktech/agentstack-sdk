/**
 * Single agent row — `['agents', projectId, agentId]`.
 */

import type { AgentRowDTO } from '@agentstack/sdk';
import { useSDKInstance } from '../context/SDKContext';
import { useSDKQuery, type SDKQueryOptions } from './useSDKQuery';

export type AgentDetailResponse = { success: boolean; agent: AgentRowDTO };

export function useAgent(
  projectId: number | undefined,
  agentId: string | undefined,
  options?: SDKQueryOptions<AgentDetailResponse>,
) {
  const sdk = useSDKInstance();
  return useSDKQuery<AgentDetailResponse>(
    sdk,
    ['agents', projectId, agentId],
    async () => {
      if (projectId == null || !agentId) throw new Error('projectId and agentId required');
      return sdk.agentsFleet.get(projectId, agentId);
    },
    {
      enabled: Boolean(projectId && agentId),
      staleTime: 15_000,
      ...options,
    },
  );
}
