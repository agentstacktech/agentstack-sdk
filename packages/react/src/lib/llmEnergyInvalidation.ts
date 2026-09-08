/**
 * LLM energy React Query invalidation — register in app invalidation registry.
 * Genetic tag: sdk.energy.gen1
 */

import type { QueryKeyPrefix } from './invalidationRegistry';

export const SDK_ENTITY_LLM_ENERGY = 'llm_energy';

/** Prefixes used by useEnergyBalance, EnergyPackCheckout, useProjectAiRuntime. */
export const SDK_LLM_ENERGY_QUERY_PREFIXES: readonly QueryKeyPrefix[] = [
  ['energy-balance'],
  ['energy-packs'],
  ['project-ai-runtime'],
  ['project-energy-balance'],
];

export const SDK_LLM_ENERGY_INVALIDATION_CONFIG = {
  entities: {
    [SDK_ENTITY_LLM_ENERGY]: { prefixes: SDK_LLM_ENERGY_QUERY_PREFIXES },
  },
} as const;
