/**
 * Stored run trace events — `['agent-traces', projectId, agentId, runId]`.
 */

import { useSDKInstance } from '../context/SDKContext';
import { useSDKQuery, type SDKQueryOptions } from './useSDKQuery';

export function useAgentTraces(
  projectId: number | undefined,
  agentId: string | undefined,
  runId: string | undefined,
  options?: SDKQueryOptions<Record<string, unknown>>,
) {
  const sdk = useSDKInstance();
  return useSDKQuery<Record<string, unknown>>(
    sdk,
    ['agent-traces', projectId, agentId, runId],
    async () => {
      if (projectId == null || !agentId || !runId) throw new Error('projectId, agentId, runId required');
      return sdk.agentsFleet.traces(projectId, agentId, runId);
    },
    {
      enabled: Boolean(projectId && agentId && runId),
      staleTime: 5_000,
      ...options,
    },
  );
}
