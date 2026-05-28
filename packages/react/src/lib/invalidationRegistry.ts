/**
 * Pluggable invalidation map: entity name → TanStack Query prefixes.
 * Apps register their consumer keys here; SDK stays free of product-specific strings.
 * Genetic tag: sdk.react.invalidation.gen1
 */

import type { QueryKey } from '@tanstack/react-query';

export type QueryKeyPrefix = readonly string[];

/** Structural typing avoids duplicate `@tanstack/query-core` instances (app vs SDK). */
export interface InvalidateQueriesClient {
  invalidateQueries(
    filters: { predicate?: (q: { queryKey: QueryKey }) => boolean }
  ): Promise<unknown>;
}

export interface EntityInvalidationConfig {
  /** React Query key prefixes (partial match / prefix invalidation). */
  prefixes: readonly QueryKeyPrefix[];
}

export interface InvalidationRegistryConfig {
  entities: Record<string, EntityInvalidationConfig>;
}

export interface InvalidationRegistry {
  getConfig(entity: string): EntityInvalidationConfig | undefined;
  /** Invalidate all queries whose key starts with any registered prefix for the entity. */
  invalidateEntity(queryClient: InvalidateQueriesClient, entity: string): Promise<void>;
  /** Invalidate explicit extra prefixes (e.g. one-off mutation). */
  invalidatePrefixes(
    queryClient: InvalidateQueriesClient,
    prefixes: readonly QueryKeyPrefix[]
  ): Promise<void>;
}

function prefixPredicate(prefix: QueryKeyPrefix) {
  return (q: { queryKey: QueryKey }) => {
    const key = q.queryKey;
    if (!Array.isArray(key) || prefix.length === 0) return false;
    for (let i = 0; i < prefix.length; i++) {
      if (key[i] !== prefix[i]) return false;
    }
    return true;
  };
}

export function createInvalidationRegistry(
  config: InvalidationRegistryConfig
): InvalidationRegistry {
  return {
    getConfig(entity: string) {
      return config.entities[entity];
    },
    async invalidateEntity(queryClient: InvalidateQueriesClient, entity: string) {
      const cfg = config.entities[entity];
      if (!cfg?.prefixes?.length) return;
      await Promise.all(
        cfg.prefixes.map((prefix) =>
          queryClient.invalidateQueries({ predicate: prefixPredicate(prefix) })
        )
      );
    },
    async invalidatePrefixes(
      queryClient: InvalidateQueriesClient,
      prefixes: readonly QueryKeyPrefix[]
    ) {
      await Promise.all(
        prefixes.map((prefix) =>
          queryClient.invalidateQueries({ predicate: prefixPredicate(prefix) })
        )
      );
    },
  };
}
