/**
 * Bootstrap helper for agent scripts — discover surfaces before first API call.
 * Genetic tag: repo.platform.sdk.ai_surface.gen1
 */
import { AgentStackSDK } from '../sdk';
import type { SDKConfig } from '../types/shared/SDKConfig';

export type AgentSession = {
  sdk: AgentStackSDK;
  catalog: ReturnType<AgentStackSDK['getModuleCatalog']>;
  matrix: ReturnType<AgentStackSDK['getCapabilityMatrix']>;
};

/** Create SDK + module catalog + capability matrix in one call. */
export function createAgentSession(config?: SDKConfig): AgentSession {
  const sdk = new AgentStackSDK(config ?? {});
  return {
    sdk,
    catalog: sdk.getModuleCatalog(),
    matrix: sdk.getCapabilityMatrix(),
  };
}
