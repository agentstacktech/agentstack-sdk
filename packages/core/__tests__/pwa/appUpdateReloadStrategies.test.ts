import {
  defaultUserReloadStrategy,
  defaultDeepRecoveryStrategy,
} from '../../src/pwa/appUpdateReloadStrategies';

describe('appUpdateReloadStrategies', () => {
  it('L0 sw_waiting prefers skipWaiting even when serverStartedAt is set', async () => {
    const runSwUpdate = jest.fn(async () => undefined);
    const hardReload = jest.fn();
    await defaultUserReloadStrategy({
      reason: 'sw_waiting',
      mode: 'user',
      serverStartedAt: '2026-01-01T00:00:00Z',
      selectedTier: 0,
      runSwUpdate,
      hardReload,
    });
    expect(runSwUpdate).toHaveBeenCalledWith(true);
    expect(hardReload).not.toHaveBeenCalled();
  });

  it('L1 deploy uses hardReload when serverStartedAt is set', async () => {
    const runSwUpdate = jest.fn(async () => undefined);
    const hardReload = jest.fn();
    await defaultUserReloadStrategy({
      reason: 'deploy',
      mode: 'user',
      serverStartedAt: '2026-01-01T00:00:00Z',
      selectedTier: 1,
      runSwUpdate,
      hardReload,
    });
    expect(hardReload).toHaveBeenCalledWith('2026-01-01T00:00:00Z');
    expect(runSwUpdate).not.toHaveBeenCalled();
  });

  it('deep recovery awaits hardReloadCacheBust', async () => {
    let resolved = false;
    const hardReloadCacheBust = jest.fn(
      () =>
        new Promise<void>((resolve) => {
          setTimeout(() => {
            resolved = true;
            resolve();
          }, 5);
        }),
    );
    await defaultDeepRecoveryStrategy({
      reason: 'build_id',
      mode: 'policy_deep_recovery',
      runSwUpdate: async () => undefined,
      hardReload: () => undefined,
      clearCaches: async () => undefined,
      unregisterSw: async () => undefined,
      hardReloadCacheBust,
    });
    expect(hardReloadCacheBust).toHaveBeenCalled();
    expect(resolved).toBe(true);
  });
});
