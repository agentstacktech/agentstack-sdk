import { raceServiceWorkerReady } from '../../src/pwa/serviceWorkerReady';

describe('raceServiceWorkerReady', () => {
  const original = globalThis.navigator;

  afterEach(() => {
    jest.useRealTimers();
    Object.defineProperty(globalThis, 'navigator', {
      value: original,
      configurable: true,
    });
  });

  it('resolves undefined when timeout wins', async () => {
    jest.useFakeTimers();
    const ready = new Promise<ServiceWorkerRegistration>(() => {
      /* never resolves */
    });
    Object.defineProperty(globalThis, 'navigator', {
      value: {
        serviceWorker: {
          ready,
        },
      },
      configurable: true,
    });

    const p = raceServiceWorkerReady(50);
    jest.advanceTimersByTime(60);
    await expect(p).resolves.toBeUndefined();
  });

  it('resolves ready when it settles before timeout', async () => {
    jest.useFakeTimers();
    const mockReg = { scope: 'https://x.test/' } as unknown as ServiceWorkerRegistration;
    Object.defineProperty(globalThis, 'navigator', {
      value: {
        serviceWorker: {
          ready: Promise.resolve(mockReg),
        },
      },
      configurable: true,
    });

    const p = raceServiceWorkerReady(5000);
    jest.advanceTimersByTime(0);
    await expect(p).resolves.toBe(mockReg);
  });
});
