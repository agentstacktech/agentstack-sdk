import type { QueryKey } from '@tanstack/react-query';

/**
 * Structural stand-in for TanStack `QueryClient` when multiple physical copies
 * of `@tanstack/query-core` exist (workspace `file:` links).
 */
export interface TanStackQueryClientLike {
  getQueryData<TData = unknown>(queryKey: QueryKey): TData | undefined;
  setQueryData<TData>(
    queryKey: QueryKey,
    updater: TData | ((old: TData | undefined) => TData | undefined)
  ): unknown;
  invalidateQueries(
    filters: { queryKey: QueryKey } & Record<string, unknown>
  ): Promise<void>;
  cancelQueries(
    filters: { queryKey: QueryKey } & Record<string, unknown>
  ): Promise<void>;
  refetchQueries(
    filters: { queryKey: QueryKey; exact?: boolean } & Record<string, unknown>
  ): Promise<unknown>;
}

/** Subset used by {@link performActionUpdate}. */
export type PerformActionQueryClient = Pick<
  TanStackQueryClientLike,
  'getQueryData' | 'setQueryData' | 'invalidateQueries'
>;
