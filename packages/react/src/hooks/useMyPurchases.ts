import type { MyPurchaseRow } from '@agentstack/sdk/commerce/entitlements';

import { useSDKInstance } from '../context/SDKContext';
import { commerceKeys } from '../commerce/commerceQueryKeys';
import { useSDKQuery, type SDKQueryOptions } from './useSDKQuery';

export type MyPurchasesResult = { purchases: MyPurchaseRow[]; total: number };

export function useMyPurchases(
  projectId?: number,
  limit = 50,
  options?: SDKQueryOptions<MyPurchasesResult>,
) {
  const sdk = useSDKInstance();
  return useSDKQuery(
    sdk,
    commerceKeys.myPurchases(projectId, limit),
    () => sdk.commerce.entitlements.listMyPurchases({ projectId, limit }),
    {
      staleTime: 30_000,
      ...options,
    },
  );
}
