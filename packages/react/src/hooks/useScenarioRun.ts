import type { ScenarioRunResult } from '@agentstack/sdk';
import type { UseQueryResult } from '@tanstack/react-query';

import { testnetKeys } from '../economy/testnetQueryKeys';
import { useSDKInstance } from '../context/SDKContext';
import { useSDKQuery, type SDKQueryOptions } from './useSDKQuery';

/**
 * Poll a testnet scenario run (`sdk.admin.testnet.getScenarioRun`).
 * Gene: `core.economy.agentnet.testnet_plane.gen1`
 */
export function useScenarioRun(
  runId: string | null | undefined,
  opts?: SDKQueryOptions<ScenarioRunResult> & { pollWhileRunning?: boolean },
): UseQueryResult<ScenarioRunResult, Error> {
  const sdk = useSDKInstance();
  const pollWhileRunning = opts?.pollWhileRunning !== false;
  return useSDKQuery(
    sdk,
    testnetKeys.scenarioRun(runId ?? ''),
    () => {
      if (!runId) {
        return Promise.reject(new Error('runId required'));
      }
      return sdk.admin.testnet.getScenarioRun(runId);
    },
    {
      enabled: Boolean(runId),
      retry: false,
      refetchInterval: (query) => {
        if (!pollWhileRunning) return false;
        const status = String(query.state.data?.status ?? '').toLowerCase();
        return status === 'running' || status === 'pending' ? 2000 : false;
      },
      ...opts,
    },
  );
}
