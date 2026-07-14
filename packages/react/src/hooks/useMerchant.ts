import type { SellerDashboard } from '@agentstack/sdk/commerce/merchant';
import type { UseQueryResult } from '@tanstack/react-query';

import { useSDKInstance } from '../context/SDKContext';
import { commerceKeys } from '../commerce/commerceQueryKeys';
import { useSDKQuery, type SDKQueryOptions } from './useSDKQuery';

export function useMerchant(
  projectId: number | undefined,
  options?: SDKQueryOptions<SellerDashboard>,
): UseQueryResult<SellerDashboard, Error> {
  const sdk = useSDKInstance();
  return useSDKQuery(
    sdk,
    commerceKeys.merchantDashboard(projectId ?? 0),
    () => {
      if (!projectId) {
        return Promise.reject(new Error('projectId required'));
      }
      return sdk.commerce.merchant.getDashboard(projectId);
    },
    {
      enabled: Boolean(projectId),
      staleTime: 30_000,
      ...options,
    },
  );
}
