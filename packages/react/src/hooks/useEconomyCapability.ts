/**
 * Economy-related capability hints (RBAC `/rbac/check`).
 * Genetic tag: sdk.economy.gen1
 */

import { useCapability, type UseCapabilityResult } from './useCapability';

export type EconomyCapability =
  | 'agentnet'
  | 'agentcoin_post'
  | 'agents_run'
  | 'payments';

export function useEconomyCapability(
  projectId: number | undefined,
  capability: EconomyCapability,
): UseCapabilityResult {
  return useCapability(projectId, capability as Parameters<typeof useCapability>[1]);
}
