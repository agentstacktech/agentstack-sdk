/**
 * Mutation helper: on success, invalidate registry entity (optional) + extra prefixes.
 */

import { useQueryClient } from '@tanstack/react-query';
import { useInvalidationRegistry } from '../context/InvalidationRegistryContext';
import { useSDK } from '../context/SDKContext';
import { useSDKMutation, type SDKMutationOptions } from './useSDKMutation';
import type { InvalidateQueriesClient, InvalidationRegistry } from '../lib/invalidationRegistry';

export interface UseSDKMutationWithInvalidationOptions<TData, TVariables>
  extends SDKMutationOptions<TData, TVariables> {
  /** Registry entity id (see app invalidation registry). */
  invalidateEntity?: string;
  /** Additional query key prefixes after success. */
  extraPrefixes?: readonly (readonly string[])[];
}

export function useSDKMutationWithInvalidation<TData = unknown, TVariables = unknown>(
  mutationKey: string,
  mutationFn: (variables: TVariables) => Promise<TData>,
  options?: UseSDKMutationWithInvalidationOptions<TData, TVariables>
) {
  const { sdk } = useSDK();
  const queryClient = useQueryClient();
  const registry = useInvalidationRegistry();
  const { invalidateEntity, extraPrefixes, onSuccess, ...rest } = options ?? {};

  return useSDKMutation<TData, TVariables>(sdk, mutationKey, mutationFn, {
    ...rest,
    onSuccess: async (data, variables, onMutateResult, context) => {
      if (invalidateEntity && registry) {
        await registry.invalidateEntity(queryClient, invalidateEntity);
      }
      if (extraPrefixes?.length && registry) {
        await registry.invalidatePrefixes(queryClient, [...extraPrefixes]);
      }
      await onSuccess?.(data, variables, onMutateResult, context);
    },
  });
}

/** Imperative helper when hooks are not available. */
export async function invalidateAfterRegistryWrite(
  queryClient: InvalidateQueriesClient,
  registry: InvalidationRegistry | null,
  opts: { entity?: string; extraPrefixes?: readonly (readonly string[])[] }
): Promise<void> {
  if (opts.entity && registry) {
    await registry.invalidateEntity(queryClient, opts.entity);
  }
  if (opts.extraPrefixes?.length && registry) {
    await registry.invalidatePrefixes(queryClient, [...opts.extraPrefixes]);
  }
}
