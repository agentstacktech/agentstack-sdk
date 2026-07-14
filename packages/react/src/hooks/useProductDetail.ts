import type { ProductBundle } from '@agentstack/sdk/commerce/shop';
import type { UseQueryResult } from '@tanstack/react-query';

import { useSDKInstance } from '../context/SDKContext';
import { commerceKeys } from '../commerce/commerceQueryKeys';
import { useSDKQuery, type SDKQueryOptions } from './useSDKQuery';

export function useProductDetail(
  listingUuid: string | undefined,
  options?: SDKQueryOptions<ProductBundle>,
): UseQueryResult<ProductBundle, Error> {
  const sdk = useSDKInstance();
  return useSDKQuery(
    sdk,
    commerceKeys.product(listingUuid ?? ''),
    () => {
      if (!listingUuid?.trim()) {
        return Promise.reject(new Error('listingUuid required'));
      }
      return sdk.commerce.discovery.getProduct(listingUuid);
    },
    {
      enabled: Boolean(listingUuid?.trim()),
      staleTime: 30_000,
      ...options,
    },
  );
}
