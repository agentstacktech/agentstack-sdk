/**
 * Coarse capability checks via RBAC POST /rbac/check (permission string = capability id).
 * Genetic tag: sdk.react.capability.gen1
 */

import type { AgentStackSDK } from '@agentstack/sdk';
import { useSDK } from '../context/SDKContext';
import { useSDKQuery } from './useSDKQuery';

export type SDKCapability =
  | 'field_access_policy'
  | 'admin_settings'
  | 'rbac_management'
  | 'wallet_admin'
  | 'analytics_admin'
  | 'builder_access';

export interface UseCapabilityResult {
  allowed: boolean;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Returns whether the current user is granted the capability on the project.
 * Backend must accept the capability string (or alias) in `/rbac/check`.
 */
export function useCapability(
  projectId: number | undefined,
  capability: SDKCapability
): UseCapabilityResult {
  const { sdk } = useSDK();

  const query = useSDKQuery<boolean>(
    sdk,
    ['sdk-capability', projectId, capability],
    async () => {
      if (projectId == null || projectId <= 0) return false;
      if (!sdk.rbac?.checkCapability) return false;
      return sdk.rbac.checkCapability(projectId, capability);
    },
    {
      enabled: projectId != null && projectId > 0 && !!sdk?.rbac,
      staleTime: 60_000,
      refetchOnWindowFocus: false,
    }
  );

  return {
    allowed: Boolean(query.data),
    loading: query.isPending,
    error: query.error,
    refetch: query.refetch,
  };
}
