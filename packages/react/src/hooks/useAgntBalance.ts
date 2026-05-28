import type { AgentCoinBalancePayload } from '@agentstack/sdk';
import type { UseQueryResult } from '@tanstack/react-query';

import { useSDKInstance } from '../context/SDKContext';
import { useSDKQuery } from './useSDKQuery';
import { economyKeys } from '../economy/economyQueryKeys';

export function useAgntBalance(
  projectId: number | undefined,
  accountKey: string,
  assetCode = 'AGNT',
): UseQueryResult<AgentCoinBalancePayload, Error> {
  const sdk = useSDKInstance();
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
      enabled: Boolean(projectId && accountKey.trim()),
      retry: false,
      staleTime: 45_000,
    },
  );
}
