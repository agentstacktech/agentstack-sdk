/**
 * Wraps SDK mutations with invalidation prefixes from resource manifests.
 * Genetic tag: `sdk.react.resource_surface.gen1`
 */
import { useSDK } from '../context/SDKContext';
import {
  useSDKMutationWithInvalidation,
  type UseSDKMutationWithInvalidationOptions,
} from '../hooks/useSDKMutationWithInvalidation';

export interface CreateResourceMutationOptions<TVariables, TData>
  extends Omit<UseSDKMutationWithInvalidationOptions<TData, TVariables>, 'extraPrefixes'> {
  mutationKey: string;
  mutationFn: (variables: TVariables) => Promise<TData>;
  invalidationPrefixes: string[];
}

export function useResourceMutation<TVariables, TData>(
  options: CreateResourceMutationOptions<TVariables, TData>,
) {
  const { sdk } = useSDK();
  const { mutationKey, mutationFn, invalidationPrefixes, ...rest } = options;
  return useSDKMutationWithInvalidation<TData, TVariables>(
    mutationKey,
    mutationFn,
    {
      ...rest,
      extraPrefixes: invalidationPrefixes.map((p) => [p] as const),
    },
  );
}
