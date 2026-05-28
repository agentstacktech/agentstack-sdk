/**
 * PWA / Service Worker helpers shared by the SPA and `@agentstack/sdk` consumers.
 *
 * **Why:** On mobile WebKit, `navigator.serviceWorker.ready` may follow a long install/activate
 * queue. Awaiting it *before* probing `getRegistration()` / `getRegistrations()` can leave Settings
 * and Web Push flows stuck indefinitely (see `usePwaServiceWorker` doc in the frontend).
 *
 * Gene: `frontend.pwa.push_health.gen1` (consumer) · `sdk.mobile.gen1` (surface-adjacent).
 */

/**
 * Resolves to the same value as `navigator.serviceWorker.ready`, or `undefined` if the timeout
 * elapses first (no rejection — callers should fall back to `getRegistrations()` probes).
 */
export async function raceServiceWorkerReady(
  timeoutMs: number,
): Promise<ServiceWorkerRegistration | undefined> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    return undefined;
  }
  const ms = Math.max(0, timeoutMs);
  try {
    return await Promise.race([
      navigator.serviceWorker.ready,
      new Promise<undefined>((resolve) => {
        setTimeout(() => resolve(undefined), ms);
      }),
    ]);
  } catch {
    return undefined;
  }
}
