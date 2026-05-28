import { useNetworkOnlineFromTabActivity } from '@agentstack/sdk';
import type { AgentStackSDK, ITabActivitySurface } from '@agentstack/sdk';

function minimalActivitySurface(): ITabActivitySurface {
  return {
    isActive: true,
    subscribe: () => () => {},
    registerRelaySession: () => () => {},
  };
}

/**
 * Subscribes to navigator on-line state via optional {@link AgentStackSDK.activity}
 * (`subscribeTopic('online')` + `isOnline`), same wiring pattern as {@link useIsTabActive}.
 * Defaults to `true` when `activity` is missing (SSR or minimal SDK setup).
 */
export function useNetworkOnline(sdk: AgentStackSDK): boolean {
  const activity = (sdk as AgentStackSDK & { activity?: ITabActivitySurface }).activity;
  return useNetworkOnlineFromTabActivity(activity ?? minimalActivitySurface());
}
