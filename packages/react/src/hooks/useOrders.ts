import { useSDKInstance } from '../context/SDKContext';
import { commerceKeys } from '../commerce/commerceQueryKeys';
import { useSDKQuery, type SDKQueryOptions } from './useSDKQuery';

export function useOrders(
  limit = 50,
  orderId?: string,
  options?: SDKQueryOptions<unknown>,
) {
  const sdk = useSDKInstance();

  const list = useSDKQuery(
    sdk,
    commerceKeys.orders(limit),
    () => sdk.commerce.orders.listOrders(limit),
    {
      enabled: !orderId,
      staleTime: 20_000,
      ...options,
    },
  );

  const detail = useSDKQuery(
    sdk,
    commerceKeys.order(orderId ?? ''),
    () => {
      if (!orderId?.trim()) {
        return Promise.reject(new Error('orderId required'));
      }
      return sdk.commerce.orders.getOrder(orderId);
    },
    {
      enabled: Boolean(orderId?.trim()),
      staleTime: 20_000,
      ...options,
    },
  );

  return orderId ? detail : list;
}
