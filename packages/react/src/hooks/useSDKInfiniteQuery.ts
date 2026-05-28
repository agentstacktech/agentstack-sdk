import {
  useInfiniteQuery,
  type InfiniteData,
  type UseInfiniteQueryResult,
  type QueryFunctionContext,
} from '@tanstack/react-query';
import type { AgentStackSDK } from '@agentstack/sdk';

export interface SDKInfiniteQueryOptions<T> {
  getNextPageParam?: (lastPage: T, allPages: T[]) => unknown;
  initialPageParam?: unknown;
  cache?: boolean;
  staleTime?: number;
  gcTime?: number;
  enabled?: boolean;
  /** When set, overrides TanStack default retries (AgentCoin: use ``false`` to avoid 503 spam). */
  retry?: number | boolean | ((failureCount: number, error: Error) => boolean);
}

function keyStringFromKey(key: string | readonly unknown[]): string {
  if (typeof key === 'string') return key;
  return key.map(String).join(':');
}

/**
 * Infinite query with optional `sdk.emit` per page.
 */
export function useSDKInfiniteQuery<T = unknown>(
  sdk: AgentStackSDK,
  key: string | readonly unknown[],
  queryFn: (ctx: { pageParam: unknown; signal: AbortSignal }) => Promise<T>,
  options?: SDKInfiniteQueryOptions<T>
): UseInfiniteQueryResult<InfiniteData<T, unknown>, Error> {
  const queryKey = Array.isArray(key) ? key : [key];
  const keyStr = keyStringFromKey(key);
  const initialPageParam = options?.initialPageParam ?? 0;

  return useInfiniteQuery<T, Error>({
    queryKey,
    initialPageParam,
    queryFn: async (context: QueryFunctionContext<readonly unknown[], unknown>) => {
      const pageLabel = context.pageParam ?? initialPageParam;
      sdk.emit?.('query:start', `${keyStr}:page:${String(pageLabel)}`);
      try {
        const result = await queryFn({
          pageParam: context.pageParam,
          signal: context.signal,
        });
        sdk.emit?.('query:success', `${keyStr}:page:${String(pageLabel)}`, result);
        return result;
      } catch (error) {
        sdk.emit?.('query:error', `${keyStr}:page:${String(pageLabel)}`, error);
        throw error;
      }
    },
    getNextPageParam: options?.getNextPageParam ?? (() => undefined),
    staleTime: options?.staleTime ?? 2 * 60 * 1000,
    gcTime:
      options?.gcTime !== undefined
        ? options.gcTime
        : options?.cache !== false
          ? 30 * 60 * 1000
          : 0,
    enabled: options?.enabled !== false,
    ...(options?.retry !== undefined ? { retry: options.retry } : {}),
  });
}
