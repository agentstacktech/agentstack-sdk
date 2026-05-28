/**
 * Opinionated React Query options for entity-scoped keys (TanStack Query v5 style).
 * Genetic tag: sdk.react.entity_query.gen1
 */

import type { SDKQueryOptions } from '../hooks/useSDKQuery';

/** Default stale profiles by entity kind (extend as needed). */
export const ENTITY_STALE_TIMES_MS: Record<string, number> = {
  projects: 5 * 60 * 1000,
  users: 3 * 60 * 1000,
  wallets: 2 * 60 * 1000,
  analytics: 5 * 60 * 1000,
  default: 5 * 60 * 1000,
};

export interface EntityQueryOptionsParams<T> {
  entity: string;
  projectId: number;
  queryFn: (ctx: { signal: AbortSignal }) => Promise<T>;
  extraKeyParts?: readonly unknown[];
  overrides?: Partial<SDKQueryOptions<T>>;
}

/**
 * Build stable query key + staleTime defaults for an entity slice.
 */
export function createEntityQueryOptions<T>(params: EntityQueryOptionsParams<T>): {
  queryKey: readonly unknown[];
  queryFn: (ctx: { signal: AbortSignal }) => Promise<T>;
  options: SDKQueryOptions<T>;
} {
  const { entity, projectId, queryFn, extraKeyParts = [], overrides = {} } = params;
  const staleTime =
    overrides.staleTime ?? ENTITY_STALE_TIMES_MS[entity] ?? ENTITY_STALE_TIMES_MS.default;
  return {
    queryKey: ['entity', entity, projectId, ...extraKeyParts],
    queryFn,
    options: {
      staleTime,
      gcTime: overrides.gcTime ?? 10 * 60 * 1000,
      enabled: overrides.enabled ?? true,
      refetchOnWindowFocus: overrides.refetchOnWindowFocus ?? false,
      ...overrides,
    },
  };
}
