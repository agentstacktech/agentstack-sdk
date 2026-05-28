import { useSyncExternalStore } from 'use-sync-external-store/shim';
import type { ITabActivitySurface } from '../modules/TabActivitySurface';

function noopSubscribe(): () => void {
  return () => {};
}

/**
 * Subscribe to navigator on-line state via an {@link ITabActivitySurface} that implements
 * `subscribeTopic('online', …)` and exposes `isOnline` (e.g. the SPA ``AppActivityCoordinator``).
 *
 * SSR / tests: when `subscribeTopic` is missing, subscription is a no-op; snapshot falls back to `true`.
 */
export function useNetworkOnlineFromTabActivity(surface: ITabActivitySurface): boolean {
  return useSyncExternalStore(
    (onStoreChange: () => void) =>
      typeof surface.subscribeTopic === 'function'
        ? surface.subscribeTopic('online', onStoreChange)
        : noopSubscribe(),
    () => (typeof surface.isOnline === 'boolean' ? surface.isOnline : true),
    () => true
  );
}
