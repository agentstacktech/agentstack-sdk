import * as React from 'react';
import type { ITabActivitySurface } from '../modules/TabActivitySurface';

function noopSubscribe(): () => void {
  return () => {};
}

/** React 18+ hook; named import can fail when `@types/react` is only hoisted. */
const useSyncExternalStore = (
  React as typeof React & {
    useSyncExternalStore: <T>(
      subscribe: (onStoreChange: () => void) => () => void,
      getSnapshot: () => T,
      getServerSnapshot?: () => T,
    ) => T;
  }
).useSyncExternalStore;

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
