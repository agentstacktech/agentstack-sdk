import type { WalletSummary } from '@agentstack/sdk/commerce/participant';
import type { UseQueryResult } from '@tanstack/react-query';

import { useSDKInstance } from '../context/SDKContext';
import { commerceKeys } from '../commerce/commerceQueryKeys';
import { useSDKQuery, type SDKQueryOptions } from './useSDKQuery';

export function useWalletBalance(
  projectId?: number,
  options?: SDKQueryOptions<WalletSummary>,
): UseQueryResult<WalletSummary, Error> {
  const sdk = useSDKInstance();
  return useSDKQuery(
    sdk,
    commerceKeys.wallet(projectId),
    () => sdk.commerce.participant.getWalletSummary(projectId),
    {
      staleTime: 45_000,
      ...options,
    },
  );
}
