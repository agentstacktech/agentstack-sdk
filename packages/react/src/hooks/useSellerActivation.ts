import type { ActivationResult, ActivationSpec } from '@agentstack/sdk/commerce/sell';

import { useSDKInstance } from '../context/SDKContext';
import { commerceKeys } from '../commerce/commerceQueryKeys';
import { useSDKMutation } from './useSDKMutation';
import { useSDKQuery, type SDKQueryOptions } from './useSDKQuery';

export type ActivateSellerVariables = ActivationSpec & { idempotencyKey?: string };

export function useSellerActivation(
  projectId: number | undefined,
  options?: SDKQueryOptions<Record<string, unknown>>,
) {
  const sdk = useSDKInstance();

  const state = useSDKQuery(
    sdk,
    commerceKeys.sellerActivation(projectId ?? 0),
    () => {
      if (!projectId) {
        return Promise.reject(new Error('projectId required'));
      }
      return sdk.commerce.sell.getActivationState(projectId);
    },
    {
      enabled: Boolean(projectId),
      staleTime: 30_000,
      ...options,
    },
  );

  const activate = useSDKMutation<ActivationResult, ActivateSellerVariables>(
    sdk,
    `commerce.sell.activate.${projectId ?? 0}`,
    (vars) => {
      if (!projectId) {
        throw new Error('projectId required');
      }
      const { idempotencyKey, ...spec } = vars;
      return sdk.commerce.sell.activate(projectId, spec, idempotencyKey);
    },
  );

  return { ...state, activate };
}
