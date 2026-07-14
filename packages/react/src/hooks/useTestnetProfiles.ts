import type { ChainProfile } from '@agentstack/sdk';
import type { UseQueryResult } from '@tanstack/react-query';

import { testnetKeys } from '../economy/testnetQueryKeys';
import { useSDKInstance } from '../context/SDKContext';
import { useSDKQuery, type SDKQueryOptions } from './useSDKQuery';

/**
 * Ecosystem-admin testnet chain profiles (`sdk.admin.testnet.listProfiles`).
 * Gene: `core.economy.agentnet.testnet_plane.gen1`
 */
export function useTestnetProfiles(
  opts?: SDKQueryOptions<ChainProfile[]>,
): UseQueryResult<ChainProfile[], Error> {
  const sdk = useSDKInstance();
  return useSDKQuery(
    sdk,
    testnetKeys.profiles(),
    () => sdk.admin.testnet.listProfiles(),
    {
      staleTime: 60_000,
      retry: false,
      ...opts,
    },
  );
}
