import type { EntitlementRow } from '@agentstack/sdk/commerce/entitlements';

import { useSDKInstance } from '../context/SDKContext';
import { commerceKeys } from '../commerce/commerceQueryKeys';
import { useSDKQuery, type SDKQueryOptions } from './useSDKQuery';

export type EntitlementsResult = { entitlements: EntitlementRow[]; total: number };

export function useEntitlements(
  projectId?: number,
  status?: string,
  limit = 50,
  entitlementId?: string,
  options?: SDKQueryOptions<EntitlementsResult | EntitlementRow>,
) {
  const sdk = useSDKInstance();

  const list = useSDKQuery(
    sdk,
    commerceKeys.entitlements(projectId, status, limit),
    () => sdk.commerce.entitlements.listEntitlements({ projectId, status, limit }),
    {
      enabled: !entitlementId,
      staleTime: 30_000,
      ...options,
    },
  );

  const detail = useSDKQuery(
    sdk,
    commerceKeys.entitlement(entitlementId ?? ''),
    () => {
      if (!entitlementId?.trim()) {
        return Promise.reject(new Error('entitlementId required'));
      }
      return sdk.commerce.entitlements.getEntitlement(entitlementId);
    },
    {
      enabled: Boolean(entitlementId?.trim()),
      staleTime: 30_000,
      ...options,
    },
  );

  return entitlementId ? detail : list;
}
