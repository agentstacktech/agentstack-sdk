import { useQuery } from '@tanstack/react-query';

import type { AgentStackSDK } from '@agentstack/sdk';

export function platformGraphQueryKey(projectId: number) {
  return ['agents', 'plan-get', 'summary', projectId] as const;
}

/** Thin hook over sdk.agentsFleet.planGet (arch-react-sdk-hooks). */
export function usePlatformGraph(sdk: AgentStackSDK, projectId: number, enabled = true) {
  return useQuery({
    queryKey: platformGraphQueryKey(projectId),
    enabled: enabled && projectId > 0,
    queryFn: () =>
      sdk.agentsFleet.planGet(projectId, {
        compact: true,
        detail: 'cards',
      }),
  });
}
