/**
 * Optimistic list updates with React Query rollback (ported from app useOptimisticCache).
 */

import { useMutation, type UseMutationResult } from '@tanstack/react-query';
import { useRef } from 'react';

import type { TanStackQueryClientLike } from '../lib/tanStackQueryClientLike';

export interface OptimisticMutationOptions<TData, TVariables> {
  mutationFn: (variables: TVariables) => Promise<TData>;
  /** TanStack query key(s) to update */
  queryKeys: readonly unknown[] | readonly unknown[][];
  createOptimisticItem?: (variables: TVariables) => unknown;
  extractItem?: (response: TData) => unknown;
  getItemId?: (item: unknown) => string | number | null;
  operation?: 'create' | 'update' | 'delete';
  prepend?: boolean;
  onSuccess?: (data: TData, variables: TVariables) => void;
  onError?: (error: Error, variables: TVariables, context: unknown) => void;
  invalidateOnSuccess?: boolean;
  refetchDelay?: number;
}

function normalizeKeys(
  keys: readonly unknown[] | readonly unknown[][]
): unknown[][] {
  if (keys.length === 0) return [];
  if (Array.isArray(keys[0])) {
    return (keys as readonly unknown[][]).map((k) => [...k]);
  }
  return [[...(keys as readonly unknown[])]];
}

function updateArray(
  array: unknown[],
  item: unknown,
  operation: 'create' | 'update' | 'delete',
  prepend: boolean,
  getItemId: (item: unknown) => string | number | null
): unknown[] {
  if (operation === 'delete') {
    const itemId = getItemId(item);
    if (itemId != null) {
      return array.filter((existing) => getItemId(existing) !== itemId);
    }
    return array;
  }
  if (operation === 'update') {
    const itemId = getItemId(item);
    if (itemId != null) {
      return array.map((existing) =>
        getItemId(existing) === itemId ? item : existing
      );
    }
    return array;
  }
  const itemId = getItemId(item);
  if (itemId != null) {
    const exists = array.some((existing) => getItemId(existing) === itemId);
    if (exists) {
      return array.map((existing) =>
        getItemId(existing) === itemId ? item : existing
      );
    }
  }
  return prepend ? [item, ...array] : [...array, item];
}

function replaceOptimisticItem(
  array: unknown[],
  optimisticItem: unknown,
  actualItem: unknown,
  getItemId: (item: unknown) => string | number | null
): unknown[] {
  const optimisticId = getItemId(optimisticItem);
  const actualId = getItemId(actualItem);
  if (actualId != null) {
    const foundByActualId = array.some((x) => getItemId(x) === actualId);
    if (foundByActualId) {
      return array.map((x) => (getItemId(x) === actualId ? actualItem : x));
    }
  }
  if (optimisticId != null) {
    const index = array.findIndex((x) => getItemId(x) === optimisticId);
    if (index >= 0) {
      const next = [...array];
      next[index] = actualItem;
      return next;
    }
  }
  const opt = optimisticItem as { name?: string };
  const act = actualItem as { name?: string };
  if (opt?.name && act?.name) {
    const index = array.findIndex((item) => {
      const itemId = getItemId(item);
      return (
        (String(itemId ?? '').startsWith('temp-') && (item as { name?: string }).name === opt.name) ||
        ((item as { name?: string }).name === act.name && itemId === actualId)
      );
    });
    if (index >= 0) {
      const next = [...array];
      next[index] = actualItem;
      return next;
    }
  }
  if (actualId != null) {
    const exists = array.some((x) => getItemId(x) === actualId);
    if (exists) {
      return array.map((x) => (getItemId(x) === actualId ? actualItem : x));
    }
  }
  return [actualItem, ...array];
}

/**
 * @param queryClient — pass `useQueryClient()` from the app
 */
export function useOptimisticMutation<TData = unknown, TVariables = unknown>(
  queryClient: TanStackQueryClientLike,
  options: OptimisticMutationOptions<TData, TVariables>
): UseMutationResult<TData, Error, TVariables> {
  const rollbackDataRef = useRef<Map<string, unknown>>(new Map());
  const queryKeys = normalizeKeys(options.queryKeys);
  const operation = options.operation ?? 'create';
  const prepend = options.prepend ?? operation === 'create';
  const invalidateOnSuccess =
    options.invalidateOnSuccess ?? (operation === 'create' ? false : true);
  const refetchDelay = options.refetchDelay ?? 500;

  const extractItem =
    options.extractItem ||
    ((response: unknown) => {
      const r = response as Record<string, unknown>;
      if (r?.item) return r.item;
      if (r?.data) return r.data;
      if (r?.project) return r.project;
      if (Array.isArray(r?.projects) && (r.projects as unknown[]).length > 0) {
        return (r.projects as unknown[])[0];
      }
      if (r?.id || r?.project_id) return response;
      return response;
    });

  const getItemId =
    options.getItemId ||
    ((item: unknown) => {
      const i = item as Record<string, unknown>;
      return (i?.id ?? i?.project_id ?? i?.uuid ?? null) as string | number | null;
    });

  return useMutation({
    mutationFn: options.mutationFn,
    onMutate: async (variables: TVariables) => {
      await Promise.all(
        queryKeys.map((key) => queryClient.cancelQueries({ queryKey: key as unknown[] }))
      );

      const previousData: unknown[] = [];
      for (const key of queryKeys) {
        const data = queryClient.getQueryData(key as unknown[]);
        previousData.push(data);
        rollbackDataRef.current.set(JSON.stringify(key), data);
      }

      let optimisticItem: unknown = null;
      if (options.createOptimisticItem) {
        optimisticItem = options.createOptimisticItem(variables);
      } else if (operation === 'create') {
        optimisticItem = { ...(variables as object), id: `temp-${Date.now()}` };
      } else if (operation === 'update') {
        optimisticItem = variables;
      }

      if (optimisticItem) {
        for (const key of queryKeys) {
          queryClient.setQueryData(key as unknown[], (old: unknown) => {
            if (!old) {
              return operation === 'create' ? [optimisticItem] : old;
            }
            if (!Array.isArray(old)) {
              const o = old as Record<string, unknown>;
              const projects = o.projects ?? o.data;
              if (Array.isArray(projects)) {
                return {
                  ...o,
                  projects: updateArray(
                    projects as unknown[],
                    optimisticItem,
                    operation,
                    prepend,
                    getItemId
                  ),
                };
              }
              return old;
            }
            return updateArray(old as unknown[], optimisticItem, operation, prepend, getItemId);
          });
        }
      }

      return { previousData, optimisticItem };
    },
    onSuccess: (data: TData, variables: TVariables, context: unknown) => {
      const ctx = context as {
        previousData: unknown[];
        optimisticItem: unknown;
      };
      const actualItem = extractItem(data);
      if (actualItem) {
        for (const key of queryKeys) {
          queryClient.setQueryData(key as unknown[], (old: unknown) => {
            if (!old) return old;
            if (Array.isArray(old)) {
              return replaceOptimisticItem(
                old as unknown[],
                ctx.optimisticItem,
                actualItem,
                getItemId
              );
            }
            const o = old as Record<string, unknown>;
            if (Array.isArray(o.projects)) {
              return {
                ...o,
                projects: replaceOptimisticItem(
                  o.projects as unknown[],
                  ctx.optimisticItem,
                  actualItem,
                  getItemId
                ),
              };
            }
            if (Array.isArray(o.data)) {
              return {
                ...o,
                data: replaceOptimisticItem(
                  o.data as unknown[],
                  ctx.optimisticItem,
                  actualItem,
                  getItemId
                ),
              };
            }
            return old;
          });
        }
      }

      if (invalidateOnSuccess) {
        for (const key of queryKeys) {
          queryClient.invalidateQueries({ queryKey: key as unknown[] });
        }
        setTimeout(() => {
          for (const key of queryKeys) {
            queryClient.refetchQueries({ queryKey: key as unknown[], exact: false });
          }
        }, refetchDelay);
      }

      options.onSuccess?.(data, variables);
    },
    onError: (error: Error, variables: TVariables, context: unknown) => {
      const ctx = context as { previousData: unknown[] };
      queryKeys.forEach((key, i) => {
        queryClient.setQueryData(key as unknown[], ctx?.previousData?.[i]);
        rollbackDataRef.current.delete(JSON.stringify(key));
      });
      options.onError?.(error, variables, context);
    },
    onSettled: () => {
      rollbackDataRef.current.clear();
    },
  });
}
