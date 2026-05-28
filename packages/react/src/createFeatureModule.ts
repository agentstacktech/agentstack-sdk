/**
 * Declarative feature shell: list hook + display meta for dashboards / AI codegen.
 * Genetic tag: sdk.react.feature_module.gen1
 */

import type { ComponentType } from 'react';

export interface FeatureModuleConfig<TProps extends { projectId: number }> {
  /** Stable entity key (queries, invalidation). */
  entity: string;
  displayName: string;
  /** Optional root component for the feature surface. */
  Root?: ComponentType<TProps>;
}

export function createFeatureModule<TProps extends { projectId: number }>(
  config: FeatureModuleConfig<TProps>
) {
  return {
    entity: config.entity,
    displayName: config.displayName,
    Root: config.Root,
  };
}

export type FeatureModule<TProps extends { projectId: number }> = {
  entity: string;
  displayName: string;
  Root?: ComponentType<TProps>;
};
