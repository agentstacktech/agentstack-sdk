/**
 * Agent rollup metrics — `['agent-metrics', projectId, agentId]`.
 */

import { useSDKInstance } from '../context/SDKContext';
import { useSDKQuery, type SDKQueryOptions } from './useSDKQuery';

export function useAgentMetrics(
  projectId: number | undefined,
  agentId: string | undefined,
  options?: SDKQueryOptions<Record<string, unknown>>,
) {
  const sdk = useSDKInstance();
  return useSDKQuery<Record<string, unknown>>(
    sdk,
    ['agent-metrics', projectId, agentId],
    async () => {
      if (projectId == null || !agentId) throw new Error('projectId and agentId required');
      return sdk.agentsFleet.metrics(projectId, agentId);
    },
    {
      enabled: Boolean(projectId && agentId),
      staleTime: 20_000,
      ...options,
    },
  );
}
