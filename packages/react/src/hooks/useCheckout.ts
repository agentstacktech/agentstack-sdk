import type { CreateCheckoutSessionRequest } from '@agentstack/sdk/commerce/checkout';
import { useSDKInstance } from '../context/SDKContext';
import { commerceKeys } from '../commerce/commerceQueryKeys';
import { useSDKMutation } from './useSDKMutation';
import { useSDKQuery, type SDKQueryOptions } from './useSDKQuery';

export type CreateCheckoutSessionVariables = CreateCheckoutSessionRequest & {
  idempotencyKey?: string;
};

export type ConfirmCheckoutSessionVariables = {
  sessionId: string;
  idempotencyKey?: string;
};

export type CheckoutFromCartVariables = {
  rail?: string;
  idempotencyKey?: string;
};

export function useCheckout(
  sessionId?: string,
  options?: SDKQueryOptions<unknown>,
) {
  const sdk = useSDKInstance();

  const session = useSDKQuery(
    sdk,
    commerceKeys.checkoutSession(sessionId ?? ''),
    () => {
      if (!sessionId) {
        return Promise.reject(new Error('sessionId required'));
      }
      return sdk.commerce.checkout.getSession(sessionId);
    },
    {
      enabled: Boolean(sessionId?.trim()),
      staleTime: 5_000,
      ...options,
    },
  );

  const createSession = useSDKMutation<unknown, CreateCheckoutSessionVariables>(
    sdk,
    'commerce.checkout.createSession',
    (vars) => {
      const { idempotencyKey, ...body } = vars;
      return sdk.commerce.checkout.createSession(body, idempotencyKey);
    },
  );

  const confirmSession = useSDKMutation<unknown, ConfirmCheckoutSessionVariables>(
    sdk,
    'commerce.checkout.confirmSession',
    (vars) => sdk.commerce.checkout.confirmSession(vars.sessionId, vars.idempotencyKey),
  );

  const checkoutFromCart = useSDKMutation<unknown, CheckoutFromCartVariables>(
    sdk,
    'commerce.checkout.createFromCart',
    (vars) =>
      sdk.commerce.checkout.createFromCart(vars.rail ?? 'wallet_internal', vars.idempotencyKey),
  );

  return { session, createSession, confirmSession, checkoutFromCart };
}
