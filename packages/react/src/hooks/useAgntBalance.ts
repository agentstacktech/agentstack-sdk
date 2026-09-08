import type { AgentCoinBalancePayload } from '@agentstack/sdk';
import type { UseQueryResult } from '@tanstack/react-query';

import { useSDKInstance } from '../context/SDKContext';
import { useSDKQuery } from './useSDKQuery';
import { economyKeys } from '../economy/economyQueryKeys';

/**
 * AGNT ledger balance query. Callers must pass `options.enabled` from the
 * platform crypto gate (`ECONOMY_CRYPTO_MODE`) — default `true` is for
 * integrators that already know crypto is on; SPA uses the gated frontend hook.
 */
export function useAgntBalance(
  projectId: number | undefined,
  accountKey: string,
  assetCode = 'AGNT',
  options?: { enabled?: boolean },
): UseQueryResult<AgentCoinBalancePayload, Error> {
  const sdk = useSDKInstance();
  const gateEnabled = options?.enabled ?? true;
  return useSDKQuery(
    sdk,
    economyKeys.balance(projectId ?? 0, accountKey, assetCode),
    () => {
      if (!projectId) {
        return Promise.reject(new Error('projectId required'));
      }
      return sdk.platform.economy.ledger.getBalance(projectId, { accountKey, assetCode });
    },
    {
      enabled: gateEnabled && Boolean(projectId && accountKey.trim()),
      retry: false,
      staleTime: 45_000,
    },
  );
}
