import type { QueryKey } from '@tanstack/react-query';

import type { PerformActionQueryClient } from './tanStackQueryClientLike';

export type { PerformActionQueryClient, TanStackQueryClientLike } from './tanStackQueryClientLike';

/**
 * Optimistic cache update + server action + rollback on failure.
 * Ported from the app `philosophy` module; pass `queryClient` explicitly for tests.
 */
export interface UpdateOperation<T = unknown> {
  queryKey: QueryKey;
  updateFn: (old: T | undefined) => T;
  invalidateKeys?: QueryKey[];
}

export interface PerformActionUpdateCallbacks {
  onSuccess?: () => void;
  onError?: (error: unknown) => void;
}

export interface PerformActionUpdateOptions {
  /** Default true */
  enableOptimisticUpdates?: boolean;
}

/**
 * @example
 * ```ts
 * await performActionUpdate(
 *   queryClient,
 *   {
 *     queryKey: ['items'],
 *     updateFn: (old) => [...(old ?? []), optimisticItem],
 *     invalidateKeys: [['items', 'meta']],
 *   },
 *   () => sdk.httpClient.post('/items', body).then((r) => r.data)
 * );
 * ```
 */
export async function performActionUpdate<T = unknown>(
  queryClient: PerformActionQueryClient,
  operation: UpdateOperation<T>,
  actionFn: () => Promise<unknown>,
  callbacks?: PerformActionUpdateCallbacks,
  options?: PerformActionUpdateOptions
): Promise<unknown> {
  const enableOptimistic = options?.enableOptimisticUpdates !== false;
  let previousData: T | undefined;

  try {
    if (enableOptimistic) {
      previousData = queryClient.getQueryData<T>(operation.queryKey);
      queryClient.setQueryData(operation.queryKey, (old) =>
        operation.updateFn(old as T | undefined)
      );
    }

    const result = await actionFn();
    callbacks?.onSuccess?.();

    operation.invalidateKeys?.forEach((key) => {
      queryClient.invalidateQueries({ queryKey: key });
    });

    return result;
  } catch (error) {
    if (enableOptimistic && previousData !== undefined) {
      queryClient.setQueryData(operation.queryKey, previousData);
    }
    callbacks?.onError?.(error);
    throw error;
  }
}
