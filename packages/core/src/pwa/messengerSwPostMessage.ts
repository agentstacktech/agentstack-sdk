import { prepareServiceWorkerForClient } from './serviceWorkerContour';

export type MessengerSwGetRegistration = () => Promise<ServiceWorkerRegistration | null>;

export type MessengerSwPostMessageBridgeOptions = {
  /** Scope-aware registration probe (retries / best active live in the app). */
  getRegistration: MessengerSwGetRegistration;
  /** Optional beacon sink (e.g. app messenger perf); must stay side-effect–safe. */
  emitBeacon?: (event: string, payload?: Record<string, unknown>) => void;
};

export const MESSENGER_SW_MSG = {
  PING: 'MESSENGER_SW_PING',
  PONG: 'MESSENGER_SW_PONG',
  PREFETCH_SHELL: 'MESSENGER_SW_PREFETCH_SHELL',
  PREFETCH_DONE: 'MESSENGER_SW_PREFETCH_DONE',
} as const;

export type MessengerSwPong = {
  type: typeof MESSENGER_SW_MSG.PONG;
  requestId?: string;
  sw?: string;
};

export type MessengerSwPrefetchDone = {
  type: typeof MESSENGER_SW_MSG.PREFETCH_DONE;
  requestId?: string;
};

/**
 * Post a command to the active service worker and wait for the first reply on the port.
 * Returns ``null`` if no controller, transfer fails, or ``timeoutMs`` elapses.
 * If there is no controller yet, runs {@link prepareServiceWorkerForClient} once (same contour as Web Push).
 */
export async function postMessengerSwCommand<T extends Record<string, unknown>>(
  bridge: MessengerSwPostMessageBridgeOptions,
  payload: Record<string, unknown>,
  timeoutMs = 8000
): Promise<T | null> {
  if (typeof window === 'undefined') return null;
  let ctrl = navigator.serviceWorker?.controller;
  if (!ctrl) {
    await prepareServiceWorkerForClient({
      getRegistration: bridge.getRegistration,
      readyTimeoutMs: 12000,
      controllerTimeoutMs: 8000,
    });
    ctrl = navigator.serviceWorker?.controller ?? null;
    if (!ctrl) {
      bridge.emitBeacon?.('messenger.sw.no_controller_after_prepare', {});
      return null;
    }
  }

  return new Promise((resolve) => {
    let settled = false;
    const mc = new MessageChannel();
    const finish = (v: T | null) => {
      if (settled) return;
      settled = true;
      mc.port1.onmessage = null;
      window.clearTimeout(tid);
      resolve(v);
    };
    const tid = window.setTimeout(() => finish(null), timeoutMs);
    mc.port1.onmessage = (ev: MessageEvent) => {
      const d = ev.data as T | undefined;
      finish(d && typeof d === 'object' ? d : null);
    };
    try {
      ctrl.postMessage(payload, [mc.port2]);
    } catch {
      finish(null);
    }
  });
}

export async function pingMessengerServiceWorker(
  bridge: MessengerSwPostMessageBridgeOptions
): Promise<MessengerSwPong | null> {
  const requestId =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}`;
  return postMessengerSwCommand<MessengerSwPong>(
    bridge,
    { type: MESSENGER_SW_MSG.PING, requestId },
    5000
  );
}

export async function prefetchMessengerShellInSw(
  bridge: MessengerSwPostMessageBridgeOptions
): Promise<MessengerSwPrefetchDone | null> {
  const requestId =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}`;
  return postMessengerSwCommand<MessengerSwPrefetchDone>(
    bridge,
    { type: MESSENGER_SW_MSG.PREFETCH_SHELL, requestId },
    12_000
  );
}
