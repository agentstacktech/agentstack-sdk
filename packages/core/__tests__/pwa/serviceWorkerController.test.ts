import { waitForServiceWorkerController } from '../../src/pwa/serviceWorkerController';

describe('waitForServiceWorkerController', () => {
  const original = globalThis.navigator;

  afterEach(() => {
    jest.useRealTimers();
    Object.defineProperty(globalThis, 'navigator', {
      value: original,
      configurable: true,
    });
  });

  it('returns immediately when controller already exists', async () => {
    const ctrl = { scriptURL: 'https://x/sw.js' } as unknown as ServiceWorker;
    Object.defineProperty(globalThis, 'navigator', {
      value: {
        serviceWorker: {
          controller: ctrl,
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
        },
      },
      configurable: true,
    });
    await expect(waitForServiceWorkerController(100)).resolves.toBe(ctrl);
  });

  it('resolves when controllerchange fires before timeout', async () => {
    jest.useFakeTimers();
    let controller: ServiceWorker | null = null;
    const listeners: Record<string, Set<(ev: Event) => void>> = {};
    const addEventListener = jest.fn((type: string, fn: (ev: Event) => void) => {
      if (!listeners[type]) listeners[type] = new Set();
      listeners[type].add(fn);
    });
    const removeEventListener = jest.fn((type: string, fn: (ev: Event) => void) => {
      listeners[type]?.delete(fn);
    });
    Object.defineProperty(globalThis, 'navigator', {
      value: {
        serviceWorker: {
          get controller() {
            return controller;
          },
          addEventListener,
          removeEventListener,
        },
      },
      configurable: true,
    });
    const p = waitForServiceWorkerController(5000);
    const ctrl = { scriptURL: 'https://x/sw.js' } as unknown as ServiceWorker;
    controller = ctrl;
    for (const fn of listeners['controllerchange'] ?? []) {
      fn(new Event('controllerchange'));
    }
    jest.advanceTimersByTime(0);
    await expect(p).resolves.toBe(ctrl);
  });
});
