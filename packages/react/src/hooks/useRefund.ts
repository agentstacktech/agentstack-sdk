import type { RefundRequestBody, RefundRequestResult } from '@agentstack/sdk/commerce/refund';

import { useSDKInstance } from '../context/SDKContext';
import { commerceKeys } from '../commerce/commerceQueryKeys';
import { useSDKMutation } from './useSDKMutation';
import { useSDKQuery, type SDKQueryOptions } from './useSDKQuery';

export type RequestRefundVariables = RefundRequestBody & {
  orderId: string;
  idempotencyKey?: string;
};

export function useRefund(
  orderId?: string,
  options?: SDKQueryOptions<RefundRequestResult>,
) {
  const sdk = useSDKInstance();

  const status = useSDKQuery(
    sdk,
    commerceKeys.refundStatus(orderId ?? ''),
    () => {
      if (!orderId?.trim()) {
        return Promise.reject(new Error('orderId required'));
      }
      return sdk.commerce.refund.getRefundStatus(orderId);
    },
    {
      enabled: Boolean(orderId?.trim()),
      staleTime: 15_000,
      ...options,
    },
  );

  const requestRefund = useSDKMutation<RefundRequestResult, RequestRefundVariables>(
    sdk,
    'commerce.refund.request',
    (vars) => {
      const { orderId: oid, idempotencyKey, ...body } = vars;
      return sdk.commerce.refund.requestRefund(oid, body, idempotencyKey);
    },
  );

  return { status, requestRefund };
}
