import { prepareServiceWorkerForClient } from '../../src/pwa/serviceWorkerContour';

describe('prepareServiceWorkerForClient', () => {
  const original = globalThis.navigator;

  afterEach(() => {
    jest.useRealTimers();
    Object.defineProperty(globalThis, 'navigator', {
      value: original,
      configurable: true,
    });
  });

  it('returns registration when already active and controller exists', async () => {
    const sw = { scriptURL: 'https://x/sw.js' } as unknown as ServiceWorker;
    const reg = { active: sw, scope: 'https://x/' } as unknown as ServiceWorkerRegistration;
    Object.defineProperty(globalThis, 'navigator', {
      value: {
        serviceWorker: {
          controller: sw,
          ready: Promise.resolve(reg),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
        },
      },
      configurable: true,
    });

    await expect(
      prepareServiceWorkerForClient({
        getRegistration: async () => reg,
        readyTimeoutMs: 100,
        controllerTimeoutMs: 100,
      }),
    ).resolves.toBe(reg);
  });

  it('after ready race, uses refreshed getRegistration and waits for controller', async () => {
    jest.useFakeTimers();
    const sw = { scriptURL: 'https://x/sw.js' } as unknown as ServiceWorker;
    const regInactive = { active: null, scope: 'https://x/' } as unknown as ServiceWorkerRegistration;
    const regActive = { active: sw, scope: 'https://x/' } as unknown as ServiceWorkerRegistration;
    let n = 0;
    Object.defineProperty(globalThis, 'navigator', {
      value: {
        serviceWorker: {
          ready: Promise.resolve(regActive),
          controller: sw,
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
        },
      },
      configurable: true,
    });

    const p = prepareServiceWorkerForClient({
      getRegistration: async () => {
        n += 1;
        return n === 1 ? regInactive : regActive;
      },
      readyTimeoutMs: 5000,
      controllerTimeoutMs: 5000,
    });
    await jest.runAllTimersAsync();
    await expect(p).resolves.toBe(regActive);
  });

  it('returns null when service worker API is unavailable', async () => {
    Object.defineProperty(globalThis, 'navigator', {
      value: {},
      configurable: true,
    });
    await expect(
      prepareServiceWorkerForClient({
        getRegistration: async () => null,
        readyTimeoutMs: 40,
        controllerTimeoutMs: 40,
      }),
    ).resolves.toBeNull();
  });
});
