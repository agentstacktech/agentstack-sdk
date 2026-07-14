import type { AgentcoinChainSurfacePayload } from '@agentstack/sdk';
import type { UseQueryResult } from '@tanstack/react-query';

import { testnetKeys } from '../economy/testnetQueryKeys';
import { useSDKInstance } from '../context/SDKContext';
import { useSDKQuery, type SDKQueryOptions } from './useSDKQuery';

export type ChainSurfaceAudience = 'project' | 'admin' | 'public';

export interface UseChainSurfaceOptions extends SDKQueryOptions<AgentcoinChainSurfacePayload> {
  audience?: ChainSurfaceAudience;
}

/**
 * Chain surface snapshot — project (`sdk.economy.chainSurface`), admin, or public grants BFF.
 * Gene: `core.economy.agentnet.testnet_plane.gen1`
 */
export function useChainSurface(
  opts?: UseChainSurfaceOptions,
): UseQueryResult<AgentcoinChainSurfacePayload, Error> {
  const sdk = useSDKInstance();
  const audience = opts?.audience ?? 'project';

  const key =
    audience === 'admin'
      ? testnetKeys.chainSurfaceAdmin()
      : audience === 'public'
        ? testnetKeys.chainSurfacePublic()
        : testnetKeys.chainSurfaceProject();

  return useSDKQuery(
    sdk,
    key,
    () => {
      if (audience === 'admin') {
        return sdk.admin.chainSurface.getAdminChainSurface();
      }
      if (audience === 'public') {
        return sdk.public.grants.getChainSurface();
      }
      return sdk.platform.economy.chainSurface.getChainSurface();
    },
    {
      staleTime: 30_000,
      retry: false,
      ...opts,
    },
  );
}
