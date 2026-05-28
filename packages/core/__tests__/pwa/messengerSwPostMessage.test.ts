import {
  MESSENGER_SW_MSG,
  pingMessengerServiceWorker,
  postMessengerSwCommand,
} from '../../src/pwa/messengerSwPostMessage';

describe('messengerSwPostMessage', () => {
  const originalWindow = globalThis.window;
  const originalNavigator = globalThis.navigator;

  afterEach(() => {
    Object.defineProperty(globalThis, 'window', {
      value: originalWindow,
      configurable: true,
      writable: true,
    });
    Object.defineProperty(globalThis, 'navigator', {
      value: originalNavigator,
      configurable: true,
      writable: true,
    });
  });

  it('returns null when window is undefined (SSR / workers)', async () => {
    Object.defineProperty(globalThis, 'window', {
      value: undefined,
      configurable: true,
    });
    await expect(
      postMessengerSwCommand({ getRegistration: async () => null }, { type: MESSENGER_SW_MSG.PING }, 100)
    ).resolves.toBeNull();
  });

  it('posts via MessageChannel when controller exists', async () => {
    const reply = { type: MESSENGER_SW_MSG.PONG, requestId: 'rid-1' };
    const postMessage = jest.fn((_msg: unknown, transfer?: Transferable[]) => {
      const port2 = transfer?.[0] as MessagePort | undefined;
      if (port2) {
        queueMicrotask(() => port2.postMessage(reply));
      }
    });

    const ctrl = { postMessage } as unknown as ServiceWorker;
    Object.defineProperty(globalThis, 'window', {
      value: {
        clearTimeout: (id: number) => clearTimeout(id),
        setTimeout: (fn: () => void, ms: number) => setTimeout(fn, ms),
      },
      configurable: true,
    });
    Object.defineProperty(globalThis, 'navigator', {
      value: { serviceWorker: { controller: ctrl } },
      configurable: true,
    });

    const bridge = { getRegistration: async () => ({}) as ServiceWorkerRegistration };
    const out = await postMessengerSwCommand<typeof reply>(
      bridge,
      { type: MESSENGER_SW_MSG.PING, requestId: 'rid-1' },
      5000
    );
    expect(out).toEqual(reply);
    expect(postMessage).toHaveBeenCalled();
  });

  it('pingMessengerServiceWorker forwards PING payload', async () => {
    const postMessage = jest.fn((_msg: unknown, transfer?: Transferable[]) => {
      const port2 = transfer?.[0] as MessagePort | undefined;
      if (port2) {
        queueMicrotask(() => port2.postMessage({ type: MESSENGER_SW_MSG.PONG }));
      }
    });
    const ctrl = { postMessage } as unknown as ServiceWorker;
    Object.defineProperty(globalThis, 'window', {
      value: {
        clearTimeout: (id: number) => clearTimeout(id),
        setTimeout: (fn: () => void, ms: number) => setTimeout(fn, ms),
      },
      configurable: true,
    });
    Object.defineProperty(globalThis, 'navigator', {
      value: { serviceWorker: { controller: ctrl } },
      configurable: true,
    });

    const bridge = { getRegistration: async () => ({}) as ServiceWorkerRegistration };
    const pong = await pingMessengerServiceWorker(bridge);
    expect(pong?.type).toBe(MESSENGER_SW_MSG.PONG);
    expect(postMessage).toHaveBeenCalled();
    const payload = postMessage.mock.calls[0][0] as { type: string; requestId?: string };
    expect(payload.type).toBe(MESSENGER_SW_MSG.PING);
    expect(typeof payload.requestId).toBe('string');
    expect((payload.requestId ?? '').length).toBeGreaterThan(0);
  });
});
