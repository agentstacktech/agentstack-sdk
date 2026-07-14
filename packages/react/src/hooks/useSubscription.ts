import type {
  BuyerSubscription,
  PurchaseSubscriptionRequest,
  SubscriptionPlan,
} from '@agentstack/sdk/commerce/subscription';

import { useSDKInstance } from '../context/SDKContext';
import { commerceKeys } from '../commerce/commerceQueryKeys';
import { useSDKMutation } from './useSDKMutation';
import { useSDKQuery, type SDKQueryOptions } from './useSDKQuery';

export type PurchaseSubscriptionVariables = PurchaseSubscriptionRequest & {
  idempotencyKey?: string;
};

export type CancelSubscriptionVariables = { subscriptionId: string };
export type RenewSubscriptionVariables = { subscriptionId: string; idempotencyKey?: string };

export function useSubscription(
  projectId?: number,
  options?: SDKQueryOptions<{ plans: SubscriptionPlan[] } | { subscriptions: BuyerSubscription[] }>,
) {
  const sdk = useSDKInstance();

  const plans = useSDKQuery(
    sdk,
    commerceKeys.subscriptionPlans(projectId),
    () => sdk.commerce.subscription.listPlans(projectId),
    {
      staleTime: 60_000,
      ...options,
    },
  );

  const subscriptions = useSDKQuery(
    sdk,
    commerceKeys.subscriptions(projectId),
    () => sdk.commerce.subscription.listMySubscriptions({ projectId }),
    {
      staleTime: 30_000,
      ...options,
    },
  );

  const purchase = useSDKMutation<Record<string, unknown>, PurchaseSubscriptionVariables>(
    sdk,
    'commerce.subscription.purchase',
    (vars) => {
      const { idempotencyKey, ...body } = vars;
      return sdk.commerce.subscription.purchase(body, idempotencyKey);
    },
  );

  const cancel = useSDKMutation<Record<string, unknown>, CancelSubscriptionVariables>(
    sdk,
    'commerce.subscription.cancel',
    (vars) => sdk.commerce.subscription.cancel(vars.subscriptionId),
  );

  const renew = useSDKMutation<Record<string, unknown>, RenewSubscriptionVariables>(
    sdk,
    'commerce.subscription.renew',
    (vars) => sdk.commerce.subscription.renew(vars.subscriptionId, vars.idempotencyKey),
  );

  return { plans, subscriptions, purchase, cancel, renew };
}
