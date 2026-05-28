import { raceServiceWorkerReady } from './serviceWorkerReady';
import { waitForServiceWorkerController } from './serviceWorkerController';

/**
 * Single SDK entry for “wait for SW lifecycle enough to postMessage / push subscribe”:
 * optional scope-aware {@link SwContourPrepareOptions.getRegistration}, bounded `ready`, then controller.
 *
 * Frontend supplies `getRegistration` (e.g. `getBestServiceWorkerRegistration`); SDK only owns timings
 * and safe waits — see `docs/operations/PWA_SW_REGISTRATION_CONTOURS.md`.
 */
export type SwContourPrepareOptions = {
  readyTimeoutMs?: number;
  controllerTimeoutMs?: number;
  getRegistration?: () => Promise<ServiceWorkerRegistration | null>;
};

export async function prepareServiceWorkerForClient(
  o: SwContourPrepareOptions,
): Promise<ServiceWorkerRegistration | null> {
  let r = (await o.getRegistration?.()) ?? null;
  if (!r?.active) await raceServiceWorkerReady(o.readyTimeoutMs ?? 12000);
  r = (await o.getRegistration?.()) ?? r;
  await waitForServiceWorkerController(o.controllerTimeoutMs ?? 8000);
  /** ``controllerchange`` / ``clients.claim`` can flip ``active`` after the earlier probe — re-read. */
  r = (await o.getRegistration?.()) ?? r;
  return r;
}
