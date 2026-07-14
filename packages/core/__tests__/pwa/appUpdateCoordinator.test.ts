import {
  createAppUpdateCoordinator,
  type AppUpdateCoordinatorConfig,
} from '../../src/pwa/appUpdateCoordinator';

function makeStorage(): {
  store: Map<string, string>;
  getItem: (k: string) => string | null;
  setItem: (k: string, v: string) => void;
} {
  const store = new Map<string, string>();
  return {
    store,
    getItem: (k) => store.get(k) ?? null,
    setItem: (k, v) => store.set(k, v),
  };
}

function makeCoordinator(overrides: Partial<AppUpdateCoordinatorConfig> = {}) {
  const storage = makeStorage();
  const applyCalls: Array<{ reason: string; mode: string }> = [];
  const coordinator = createAppUpdateCoordinator({
    localBuildId: 'build-a',
    storage,
    onApply: async (opts) => {
      applyCalls.push({ reason: String(opts.reason), mode: opts.mode });
      await opts.strategy({
        reason: opts.reason,
        mode: opts.mode,
        runSwUpdate: async () => undefined,
        hardReload: () => undefined,
      });
    },
    getVisibilityState: () => 'visible',
    scheduleTimeout: (fn) => {
      fn();
      return 1;
    },
    clearTimeout: () => undefined,
    ...overrides,
  });
  return { coordinator, storage, applyCalls };
}

describe('createAppUpdateCoordinator', () => {
  it('returns stable getState reference until setState', () => {
    const { coordinator } = makeCoordinator();
    const a = coordinator.getState();
    const b = coordinator.getState();
    expect(a).toBe(b);
    coordinator.ingestSignal({ reason: 'sw_waiting' });
    const c = coordinator.getState();
    expect(c).not.toBe(a);
    expect(coordinator.getState()).toBe(c);
  });

  it('suppresses duplicate signal keys', () => {
    const { coordinator } = makeCoordinator();
    coordinator.ingestSignal({ reason: 'sw_waiting' });
    coordinator.ingestSignal({ reason: 'sw_waiting' });
    expect(coordinator.getState().status).toBe('pending');
  });

  it('defers critical dismiss without clearing reason', () => {
    const { coordinator, storage } = makeCoordinator();
    coordinator.ingestSignal({ reason: 'deploy', serverStartedAt: '2026-01-01T00:00:00Z' });
    coordinator.dismiss(true);
    const s = coordinator.getState();
    expect(s.status).toBe('snoozed');
    expect(s.reason).toBe('deploy');
    expect(coordinator.shouldShowBanner()).toBe(false);
    expect(Number(storage.getItem('agentstack:pwa_update_snooze_until'))).toBeGreaterThan(Date.now());
  });

  it('snoozes sw_waiting for 24h', () => {
    const { coordinator } = makeCoordinator({ snoozeMs: 60_000 });
    coordinator.ingestSignal({ reason: 'sw_waiting' });
    coordinator.dismiss(true);
    expect(coordinator.getState().status).toBe('snoozed');
    expect(coordinator.shouldShowBanner()).toBe(false);
  });

  it('drops lower priority while pending', () => {
    const { coordinator } = makeCoordinator();
    coordinator.ingestSignal({ reason: 'deploy', serverStartedAt: 't1' });
    coordinator.ingestSignal({ reason: 'stale_assets' });
    expect(coordinator.getState().reason).toBe('deploy');
  });

  it('ingests remote BC dismiss', () => {
    const { coordinator } = makeCoordinator();
    coordinator.handleChannelMessage({
      type: 'dismiss',
      snoozeUntil: Date.now() + 5000,
      reason: 'sw_waiting',
    });
    expect(coordinator.getState().status).toBe('snoozed');
  });

  it('suppresses duplicate build_id for same remoteBuildId', () => {
    const { coordinator } = makeCoordinator();
    coordinator.ingestSignal({ reason: 'build_id', remoteBuildId: 'remote-1' });
    expect(coordinator.getState().status).toBe('pending');
    coordinator.ingestSignal({ reason: 'build_id', remoteBuildId: 'remote-1' });
    expect(coordinator.getState().status).toBe('pending');
    expect(coordinator.getState().remoteBuildId).toBe('remote-1');
  });

  it('snoozes deploy for matching serverStartedAt identity', () => {
    const { coordinator } = makeCoordinator();
    coordinator.ingestSignal({
      reason: 'deploy',
      serverStartedAt: '2026-06-01T00:00:00Z',
    });
    coordinator.dismiss(true);
    coordinator.ingestSignal({
      reason: 'deploy',
      serverStartedAt: '2026-06-01T00:00:00Z',
    });
    expect(coordinator.shouldShowBanner()).toBe(false);
    coordinator.ingestSignal({
      reason: 'deploy',
      serverStartedAt: '2026-06-02T00:00:00Z',
    });
    expect(coordinator.getState().status).toBe('pending');
  });

  it('suggests deep recovery after failed reload identity', () => {
    const { coordinator, storage } = makeCoordinator({ localBuildId: '0.4.13-t1000' });
    const remote = '0.4.13-t2000';
    storage.setItem(
      'agentstack:pwa_update_recovery_v1',
      JSON.stringify({ v: 1, lastApplyIdentity: `build_id:0.4.13-t1000:${remote}` }),
    );
    coordinator.ingestSignal({ reason: 'build_id', remoteBuildId: remote });
    const s = coordinator.getState();
    expect(s.suggestDeepRecovery).toBe(true);
    expect(coordinator.shouldShowBanner()).toBe(true);
  });

  it('suppresses banner when recovery is ineffective', () => {
    const { coordinator, storage } = makeCoordinator({ localBuildId: '0.4.13-t1000' });
    const remote = '0.4.13-t2000';
    storage.setItem(
      'agentstack:pwa_update_recovery_v1',
      JSON.stringify({ v: 1, ineffectiveFor: `build_id:0.4.13-t1000:${remote}` }),
    );
    coordinator.ingestSignal({ reason: 'build_id', remoteBuildId: remote });
    expect(coordinator.getState().ineffectiveSuppressed).toBe(true);
    expect(coordinator.shouldShowBanner()).toBe(false);
  });

  it('blocks dismiss when force floor is required', () => {
    const { coordinator } = makeCoordinator({
      localBuildId: '0.4.12-t1000',
      localBuiltAt: '2026-05-01T00:00:00.000Z',
    });
    coordinator.ingestSignal({
      reason: 'build_id',
      remoteBuildId: '0.4.13-t2000',
      minSupportedBuildId: '0.4.13-t1500',
      remoteBuiltAt: '2026-06-01T00:00:00.000Z',
    });
    expect(coordinator.getState().forceUpdateRequired).toBe(true);
    coordinator.dismiss(true);
    expect(coordinator.getState().status).toBe('pending');
  });

  it('runs deep recovery once via forceDeepRecovery', async () => {
    const { coordinator, applyCalls } = makeCoordinator();
    coordinator.ingestSignal({ reason: 'build_id', remoteBuildId: '0.4.13-t2000' });
    await coordinator.forceDeepRecovery();
    expect(applyCalls.some((c) => c.mode === 'policy_deep_recovery')).toBe(true);
  });
});
