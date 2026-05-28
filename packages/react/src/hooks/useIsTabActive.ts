import { useSyncExternalStore } from 'react';
import type { AgentStackSDK, ITabActivitySurface } from '@agentstack/sdk';

function noopSubscribe(): () => void {
  return () => {};
}

/**
 * Subscribes to {@link AgentStackSDK.activity} when the host app attaches a coordinator.
 * Defaults to `true` when `activity` is missing (SSR or minimal SDK setup).
 */
export function useIsTabActive(sdk: AgentStackSDK): boolean {
  const activity = (sdk as AgentStackSDK & { activity?: ITabActivitySurface }).activity;
  return useSyncExternalStore(
    activity?.subscribe ?? noopSubscribe,
    () => activity?.isActive ?? true,
    () => true
  );
}
