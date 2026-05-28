/**
 * List query + shared invalidation for an entity slice (REST-shaped apps).
 * Add mutations with `useSDKMutation` / `useSDKMutationWithInvalidation` beside this hook.
 * Genetic tag: sdk.react.entity.gen1
 */

import type { AgentStackSDK } from '@agentstack/sdk';
import { useQueryClient } from '@tanstack/react-query';
import { useInvalidationRegistry } from '../context/InvalidationRegistryContext';
import { useSDK } from '../context/SDKContext';
import { useSDKQuery, type SDKQueryOptions } from './useSDKQuery';

export interface UseEntityDataOptions<T> {
  projectId: number;
  invalidateEntity?: string;
  listQuery?: SDKQueryOptions<T[]>;
}

export function useEntityData<T extends Record<string, unknown>>(
  entity: string,
  options: UseEntityDataOptions<T> & {
    fetchList: (sdk: AgentStackSDK, signal: AbortSignal) => Promise<T[]>;
  }
) {
  const { sdk } = useSDK();
  const queryClient = useQueryClient();
  const registry = useInvalidationRegistry();
  const { projectId, fetchList, invalidateEntity, listQuery } = options;

  const query = useSDKQuery<T[]>(
    sdk,
    ['entity-crud', entity, projectId],
    (signal) => fetchList(sdk, signal),
    {
      enabled: projectId > 0,
      staleTime: 2 * 60 * 1000,
      ...listQuery,
    }
  );

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ['entity-crud', entity, projectId] });
    if (invalidateEntity && registry) {
      await registry.invalidateEntity(queryClient, invalidateEntity);
    }
  };

  return { sdk, query, invalidate };
}
