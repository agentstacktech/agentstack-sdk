/**
 * Wait until this client has a controlling service worker (post-activate / `clients.claim`),
 * or until `timeoutMs` elapses. Complements {@link raceServiceWorkerReady}: `ready` can resolve
 * before `controller` is set on cold mobile loads.
 */

export async function waitForServiceWorkerController(timeoutMs: number): Promise<ServiceWorker | undefined> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    return undefined;
  }
  const existing = navigator.serviceWorker.controller;
  if (existing) return existing;
  const ms = Math.max(0, timeoutMs);
  return new Promise((resolve) => {
    const t = setTimeout(() => {
      navigator.serviceWorker.removeEventListener('controllerchange', onCtl);
      resolve(undefined);
    }, ms);
    const onCtl = () => {
      const sw = navigator.serviceWorker.controller;
      if (sw) {
        clearTimeout(t);
        navigator.serviceWorker.removeEventListener('controllerchange', onCtl);
        resolve(sw);
      }
    };
    navigator.serviceWorker.addEventListener('controllerchange', onCtl);
  });
}
