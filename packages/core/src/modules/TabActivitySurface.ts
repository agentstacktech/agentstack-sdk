/**
 * Tab / document visibility coordination for browser apps.
 *
 * **Implemented by** `AppActivityCoordinator` in `agentstack-frontend` and attached via
 * `Object.assign(sdk, { activity: appActivityCoordinator })` in `SDKProvider`.
 *
 * **AI hint:** Prefer `sdk.activity?.isActive` or `useIsTabActive(sdk)` to skip polling,
 * heavy work, or extra network calls when `document.visibilityState === 'hidden'`.
 * Register relay/WebSocket sessions with `registerRelaySession({ poke })` so transport
 * reconnects when the user returns to the tab.
 */
/** Coarse activity channels implemented by full SPA coordinators (optional for minimal embeds). */
export type TabActivityTopic = 'visible' | 'online' | 'focus';

export interface ITabActivitySurface {
  /** True when the tab is visible (not `document.hidden`). */
  readonly isActive: boolean;
  /** Subscribe to visibility changes; returns unsubscribe. */
  subscribe(listener: () => void): () => void;
  /**
   * Register a session to receive `poke()` when the tab becomes active again
   * (e.g. resilient relay WebSocket).
   */
  registerRelaySession(session: { poke(): void }): () => void;
  /**
   * Topic-scoped subscriptions (single underlying listener per topic in typical coordinators).
   * Used by {@link useNetworkOnlineFromTabActivity} for `online` / `visible` / `focus`.
   */
  subscribeTopic?(topic: TabActivityTopic, listener: () => void): () => void;
  /** Latest `navigator.onLine` mirror when the host wires `online` / `offline` events. */
  readonly isOnline?: boolean;
}
