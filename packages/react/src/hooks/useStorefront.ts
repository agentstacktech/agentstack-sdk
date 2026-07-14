import type { ListOffersParams } from '@agentstack/sdk/commerce';

import { useSDKInstance } from '../context/SDKContext';
import { commerceKeys } from '../commerce/commerceQueryKeys';
import { useSDKQuery, type SDKQueryOptions } from './useSDKQuery';

export function useStorefront(
  params?: ListOffersParams,
  options?: SDKQueryOptions<unknown>,
) {
  const sdk = useSDKInstance();
  return useSDKQuery(
    sdk,
    commerceKeys.storefront(params),
    () => sdk.commerce.discovery.listOffers(params),
    {
      staleTime: 30_000,
      ...options,
    },
  );
}
