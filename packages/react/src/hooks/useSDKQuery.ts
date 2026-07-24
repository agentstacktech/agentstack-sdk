/**
 * TanStack Query wrapper with optional SDK telemetry and 401 circuit breaker.
 * Pass `sdk` explicitly for testability (no React context required).
 */

import {
  useQuery,
  UseQueryOptions,
  UseQueryResult,
  type QueryFunctionContext,
} from '@tanstack/react-query';
import type { AgentStackSDK } from '@agentstack/sdk';
import { isNonRetryableAuthOrShed } from '@agentstack/sdk';
import { useEffect, useRef, useState } from 'react';

export interface SDKQueryOptions<T> {
  enabled?: boolean;
  autoLoad?: boolean;
  cache?: boolean;
  staleTime?: number;
  refetchInterval?: UseQueryOptions<T, Error>['refetchInterval'];
  refetchOnMount?: UseQueryOptions<T, Error>['refetchOnMount'];
  refetchOnWindowFocus?: boolean;
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
  gcTime?: number;
  placeholderData?: UseQueryOptions<T, Error>['placeholderData'];
  select?: UseQueryOptions<T, Error>['select'];
  retry?: UseQueryOptions<T, Error>['retry'];
  initialData?: UseQueryOptions<T, Error>['initialData'];
  initialDataUpdatedAt?: UseQueryOptions<T, Error>['initialDataUpdatedAt'];
  refetchOnReconnect?: UseQueryOptions<T, Error>['refetchOnReconnect'];
  /** Passed through to TanStack Query (e.g. narrow observer updates for hot keys). */
  notifyOnChangeProps?: UseQueryOptions<T, Error>['notifyOnChangeProps'];
}

function keyStringFromKey(key: string | readonly unknown[]): string {
  if (typeof key === 'string') return key;
  return key.map(String).join(':');
}

function isAdminOrOAuthKeyString(keyString: string): boolean {
  return (
    keyString.startsWith('admin-') ||
    keyString === 'oauth-providers' ||
    keyString.startsWith('oauth-providers')
  );
}

function isAdminOverviewUnavailable(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const detail = (error as { detail?: unknown }).detail;
  if (detail === 'admin_overview_unavailable') return true;
  if (typeof detail === 'string' && detail.includes('admin_overview_unavailable')) return true;
  const message = (error as Error).message;
  return typeof message === 'string' && message.includes('admin_overview_unavailable');
}

function is401Error(error: unknown): boolean {
  return isNonRetryableAuthOrShed(error);
}

/** Fetch/React Query cancellation — not a user-visible failure. */
function isAbortLikeError(error: unknown): boolean {
  if (error == null) return false;
  const e = error as { name?: string; message?: string };
  if (e.name === 'AbortError') return true;
  const m = typeof e.message === 'string' ? e.message.toLowerCase() : '';
  if (m.includes('the operation was aborted') || m.includes('aborted')) return true;
  return false;
}

/**
 * @example
 * ```tsx
 * const { data, isPending } = useSDKQuery(
 *   sdk,
 *   'my-list',
 *   (signal) => sdk.httpClient.get('/items', undefined, { signal }).then((r) => r.data),
 *   { staleTime: 30_000 }
 * );
 * ```
 */
export function useSDKQuery<T = unknown>(
  sdk: AgentStackSDK,
  key: string | readonly unknown[],
  queryFn: (signal: AbortSignal) => Promise<T>,
  options?: SDKQueryOptions<T>
): UseQueryResult<T, Error> {
  const queryKey = Array.isArray(key) ? key : [key];
  const keyStr = keyStringFromKey(key);
  const adminOrOAuth = isAdminOrOAuthKeyString(keyStr);

  const [has401Error, setHas401Error] = useState(false);
  const [hasOverviewOutage, setHasOverviewOutage] = useState(false);
  const errorCountRef = useRef(0);
  const lastErrorTimeRef = useRef(0);
  const overviewErrorCountRef = useRef(0);
  const lastOverviewErrorTimeRef = useRef(0);
  const isAdminEconomyOverviewKey =
    keyStr.includes('admin') &&
    keyStr.includes('economy') &&
    keyStr.includes('overview');

  const queryResult = useQuery<T, Error>({
    queryKey,
    queryFn: async (ctx: QueryFunctionContext) => {
      const { signal } = ctx;
      if (has401Error) {
        throw new Error('Too many 401 errors, circuit breaker active');
      }
      if (hasOverviewOutage && isAdminEconomyOverviewKey) {
        throw new Error('Admin overview unavailable, circuit breaker active');
      }

      sdk.emit?.('query:start', keyStr);

      try {
        const result = await queryFn(signal);
        errorCountRef.current = 0;
        setHas401Error(false);
        sdk.emit?.('query:success', keyStr, result);
        options?.onSuccess?.(result);
        return result;
      } catch (error) {
        if (isAbortLikeError(error)) {
          throw error;
        }
        if (is401Error(error)) {
          errorCountRef.current += 1;
          lastErrorTimeRef.current = Date.now();
          if (errorCountRef.current >= 5) {
            setHas401Error(true);
          }
        }
        if (isAdminEconomyOverviewKey && isAdminOverviewUnavailable(error)) {
          overviewErrorCountRef.current += 1;
          lastOverviewErrorTimeRef.current = Date.now();
          if (overviewErrorCountRef.current >= 2) {
            setHasOverviewOutage(true);
          }
        }
        sdk.emit?.('query:error', keyStr, error);
        options?.onError?.(error as Error);
        throw error;
      }
    },
    enabled:
      (options?.enabled !== false) &&
      options?.autoLoad !== false &&
      !has401Error &&
      !(hasOverviewOutage && isAdminEconomyOverviewKey),
    staleTime: options?.staleTime ?? (adminOrOAuth ? 0 : 2 * 60 * 1000),
    gcTime:
      options?.gcTime !== undefined
        ? options.gcTime
        : options?.cache !== false
          ? 30 * 60 * 1000
          : 0,
    refetchInterval:
      has401Error || (hasOverviewOutage && isAdminEconomyOverviewKey)
        ? false
        : options?.refetchInterval,
    refetchOnMount: options?.refetchOnMount,
    refetchOnWindowFocus: options?.refetchOnWindowFocus,
    retry: (failureCount, error) => {
      if (isNonRetryableAuthOrShed(error)) return false;
      if (isAbortLikeError(error)) return false;
      return failureCount < 2;
    },
    ...(options?.placeholderData !== undefined
      ? { placeholderData: options.placeholderData }
      : {}),
    ...(options?.select
      ? { select: options.select as UseQueryOptions<T, Error>['select'] }
      : {}),
    ...(options?.retry !== undefined ? { retry: options.retry } : {}),
    ...(options?.initialData !== undefined ? { initialData: options.initialData } : {}),
    ...(options?.initialDataUpdatedAt !== undefined
      ? { initialDataUpdatedAt: options.initialDataUpdatedAt }
      : {}),
    ...(options?.refetchOnReconnect !== undefined
      ? { refetchOnReconnect: options.refetchOnReconnect }
      : {}),
    ...(options?.notifyOnChangeProps != null
      ? { notifyOnChangeProps: options.notifyOnChangeProps }
      : {}),
  } as UseQueryOptions<T, Error>);

  useEffect(() => {
    if (typeof window === 'undefined' || !has401Error) return;
    const timeout = window.setTimeout(() => {
      const timeSinceLastError = Date.now() - lastErrorTimeRef.current;
      if (timeSinceLastError >= 10_000) {
        setHas401Error(false);
        errorCountRef.current = 0;
      }
    }, 10_000);
    return () => clearTimeout(timeout);
  }, [has401Error, keyStr]);

  useEffect(() => {
    if (typeof window === 'undefined' || !hasOverviewOutage) return;
    const timeout = window.setTimeout(() => {
      const timeSinceLastError = Date.now() - lastOverviewErrorTimeRef.current;
      if (timeSinceLastError >= 60_000) {
        setHasOverviewOutage(false);
        overviewErrorCountRef.current = 0;
      }
    }, 60_000);
    return () => clearTimeout(timeout);
  }, [hasOverviewOutage, keyStr]);

  return queryResult;
}
