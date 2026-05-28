/**
 * Process-wide **Escape** capture bridge (lazy singleton).
 *
 * Host apps (AgentStack frontend, embeds) register overlay handlers here so a
 * single `keydown` capture listener applies LIFO ordering and can call
 * `preventDefault` / `stopImmediatePropagation` when a layer consumes Escape.
 *
 * For a **fresh** bridge per test or iframe host, use {@link createKeydownCaptureBridge}
 * instead of this module singleton.
 *
 * Gene: `sdk.browser.shared_overlay_escape.gen1`
 */

import {
  createKeydownCaptureBridge,
  type KeydownCaptureBridge,
  type KeydownCaptureHandler,
} from './overlayCaptureBridges';

let sharedOverlayEscapeBridge: KeydownCaptureBridge | null = null;

/** Lazily creates the shared Escape bridge (one listener per process). */
export function getSharedOverlayEscapeBridge(): KeydownCaptureBridge {
  if (!sharedOverlayEscapeBridge) {
    sharedOverlayEscapeBridge = createKeydownCaptureBridge({ key: 'Escape' });
  }
  return sharedOverlayEscapeBridge;
}

/**
 * Register on the shared bridge; disposer removes this handler.
 * Same LIFO semantics as {@link KeydownCaptureBridge.register}.
 */
export function registerSharedOverlayEscapeConsumer(
  handler: KeydownCaptureHandler
): () => void {
  return getSharedOverlayEscapeBridge().register(handler);
}

/** Tear down listener and stack (unit tests / HMR / micro-frontend teardown). */
export function disposeSharedOverlayEscapeBridge(): void {
  sharedOverlayEscapeBridge?.dispose();
  sharedOverlayEscapeBridge = null;
}
