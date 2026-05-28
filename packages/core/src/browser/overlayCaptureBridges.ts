/**
 * Framework-agnostic **capture-phase** event bridges for SPA overlays.
 *
 * Use-cases: browser Back (`popstate`) and Escape (`keydown`) where multiple
 * layers (lightbox, sheets, context menus) must be tried **last-in-first-out**
 * before host navigation or composer shortcuts run.
 *
 * The host app passes `onConsumed` for popstate when any consumer returns
 * `true` (e.g. mask a page-level “leave route” microtask).
 *
 * Gene: `sdk.browser.overlay_capture.gen1` · pairs with
 * `frontend.social.messenger.playback.gen1` in the AgentStack frontend.
 */

export type PopStateCaptureConsumer = () => boolean;

export type PopStateCaptureBridge = {
  /** LIFO stack push; returns disposer. */
  register(consumer: PopStateCaptureConsumer): () => void;
  /** Remove listener and clear consumers (tests / HMR). */
  dispose(): void;
};

export type PopStateCaptureBridgeOptions = {
  /** Invoked synchronously after the first consumer returns `true`. */
  onConsumed?: () => void;
};

/**
 * Single `popstate` listener in **capture** phase; consumers tried LIFO.
 */
export function createPopStateCaptureBridge(
  options: PopStateCaptureBridgeOptions = {}
): PopStateCaptureBridge {
  const consumers: PopStateCaptureConsumer[] = [];
  let installed = false;

  const onPop = (event: PopStateEvent) => {
    for (let i = consumers.length - 1; i >= 0; i -= 1) {
      try {
        if (consumers[i]()) {
          options.onConsumed?.();
          // Without this, `popstate` still reaches **bubble** listeners on `window`
          // (e.g. product ``registerMessengerPopstateHandler``), so the same Back can
          // dismiss an overlay in capture and still exit a thread in a microtask.
          event.stopImmediatePropagation();
          event.stopPropagation();
          return;
        }
      } catch {
        /* keep scanning */
      }
    }
  };

  const ensure = () => {
    if (installed || typeof window === 'undefined') return;
    installed = true;
    window.addEventListener('popstate', onPop, true);
  };

  return {
    register(consumer: PopStateCaptureConsumer) {
      ensure();
      consumers.push(consumer);
      return () => {
        const idx = consumers.indexOf(consumer);
        if (idx >= 0) consumers.splice(idx, 1);
      };
    },
    dispose() {
      if (installed && typeof window !== 'undefined') {
        window.removeEventListener('popstate', onPop, true);
      }
      installed = false;
      consumers.length = 0;
    },
  };
}

export type KeydownCaptureHandler = (event: KeyboardEvent) => boolean;

export type KeydownCaptureBridgeOptions = {
  /** Key value compared to `event.key` (default `Escape`). */
  key?: string;
};

export type KeydownCaptureBridge = {
  register(handler: KeydownCaptureHandler): () => void;
  dispose(): void;
};

/**
 * Single `keydown` listener in **capture** phase for one logical key; handlers LIFO.
 */
export function createKeydownCaptureBridge(
  options: KeydownCaptureBridgeOptions = {}
): KeydownCaptureBridge {
  const key = options.key ?? 'Escape';
  const handlers: KeydownCaptureHandler[] = [];
  let installed = false;

  const onKey = (event: KeyboardEvent) => {
    if (event.key !== key) return;
    for (let i = handlers.length - 1; i >= 0; i -= 1) {
      try {
        if (handlers[i](event)) {
          event.preventDefault();
          event.stopImmediatePropagation();
          // Same rationale as ``popstate``: ``stopImmediatePropagation`` only
          // silences **other listeners on this same node**; descendants (e.g.
          // ``<textarea>`` React ``onKeyDown`` in bubble) can still see the key
          // unless propagation is stopped for the whole path.
          event.stopPropagation();
          return;
        }
      } catch {
        /* keep scanning */
      }
    }
  };

  const ensure = () => {
    if (installed || typeof window === 'undefined') return;
    installed = true;
    window.addEventListener('keydown', onKey, true);
  };

  return {
    register(handler: KeydownCaptureHandler) {
      ensure();
      handlers.push(handler);
      return () => {
        const idx = handlers.indexOf(handler);
        if (idx >= 0) handlers.splice(idx, 1);
      };
    },
    dispose() {
      if (installed && typeof window !== 'undefined') {
        window.removeEventListener('keydown', onKey, true);
      }
      installed = false;
      handlers.length = 0;
    },
  };
}
