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
        selectedTier: opts.selectedTier,
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
    expect(s.selectedTier).toBe(2);
    expect(coordinator.shouldShowBanner()).toBe(true);
  });

  it('predicts L2 on first build_id when SW controller present', () => {
    const { coordinator } = makeCoordinator({
      localBuildId: '0.4.13-t1000',
      getApplyEnvironment: () => ({
        hasWaitingWorker: false,
        hasServiceWorkerController: true,
        isStandaloneDisplay: false,
        chunkRecoveryAttempted: false,
      }),
    });
    coordinator.ingestSignal({ reason: 'build_id', remoteBuildId: '0.4.13-t2000' });
    const s = coordinator.getState();
    expect(s.selectedTier).toBe(2);
    expect(s.suggestDeepRecovery).toBe(true);
  });

  it('predicts L0 when waiting worker (not L2)', () => {
    const { coordinator } = makeCoordinator({
      getApplyEnvironment: () => ({
        hasWaitingWorker: true,
        hasServiceWorkerController: true,
        isStandaloneDisplay: false,
        chunkRecoveryAttempted: false,
      }),
    });
    coordinator.ingestSignal({ reason: 'sw_waiting' });
    expect(coordinator.getState().selectedTier).toBe(0);
    expect(coordinator.getState().suggestDeepRecovery).toBe(false);
  });

  it('applyEffective uses selectedTier mode', async () => {
    const { coordinator, applyCalls } = makeCoordinator({
      localBuildId: '0.4.13-t1000',
      getApplyEnvironment: () => ({
        hasWaitingWorker: false,
        hasServiceWorkerController: true,
        isStandaloneDisplay: false,
        chunkRecoveryAttempted: false,
      }),
    });
    coordinator.ingestSignal({ reason: 'build_id', remoteBuildId: '0.4.13-t2000' });
    await coordinator.applyEffective();
    expect(applyCalls.some((c) => c.mode === 'policy_deep_recovery')).toBe(true);
  });

  it('applyEffective force-acquires deep lock when stamp is busy', async () => {
    let forceSeen: boolean | undefined;
    const { coordinator, applyCalls } = makeCoordinator({
      localBuildId: '0.4.13-t1000',
      getApplyEnvironment: () => ({
        hasWaitingWorker: false,
        hasServiceWorkerController: true,
        isStandaloneDisplay: false,
        chunkRecoveryAttempted: false,
      }),
      acquireDeepRecoveryLock: async (opts) => {
        forceSeen = opts?.force === true;
        return true;
      },
    });
    coordinator.ingestSignal({ reason: 'build_id', remoteBuildId: '0.4.13-t2000' });
    await coordinator.applyEffective();
    expect(forceSeen).toBe(true);
    expect(applyCalls.some((c) => c.mode === 'policy_deep_recovery')).toBe(true);
  });

  it('rolls back to pending when deep lock busy without force', async () => {
    const { coordinator, applyCalls } = makeCoordinator({
      localBuildId: '0.4.13-t1000',
      getApplyEnvironment: () => ({
        hasWaitingWorker: false,
        hasServiceWorkerController: true,
        isStandaloneDisplay: false,
        chunkRecoveryAttempted: false,
      }),
      acquireDeepRecoveryLock: async () => false,
    });
    coordinator.ingestSignal({ reason: 'build_id', remoteBuildId: '0.4.13-t2000' });
    await coordinator.apply({
      reason: 'build_id',
      mode: 'policy_deep_recovery',
    });
    expect(applyCalls.length).toBe(0);
    expect(coordinator.getState().status).toBe('pending');
    expect(coordinator.getState().suggestDeepRecovery).toBe(true);
  });

  it('suppresses ingest while apply is in flight', async () => {
    let releaseApply!: () => void;
    const applyGate = new Promise<void>((resolve) => {
      releaseApply = resolve;
    });
    const { coordinator } = makeCoordinator({
      onApply: async (opts) => {
        await applyGate;
        await opts.strategy({
          reason: opts.reason,
          mode: opts.mode,
          selectedTier: opts.selectedTier,
          runSwUpdate: async () => undefined,
          hardReload: () => undefined,
        });
      },
    });
    coordinator.ingestSignal({ reason: 'build_id', remoteBuildId: 'r1' });
    const applyPromise = coordinator.apply({
      reason: 'build_id',
      mode: 'user',
    });
    await Promise.resolve();
    expect(coordinator.getState().status).toBe('applying');
    coordinator.ingestSignal({ reason: 'deploy', serverStartedAt: 't-new' });
    expect(coordinator.getState().status).toBe('applying');
    expect(coordinator.getState().reason).toBe('build_id');
    releaseApply();
    await applyPromise;
  });

  it('navigation fallback uses onNavigationFallback for deep recovery', async () => {
    const fallback = jest.fn();
    const { coordinator } = makeCoordinator({
      onNavigationFallback: fallback,
      scheduleTimeout: (fn) => {
        fn();
        return 1;
      },
    });
    coordinator.ingestSignal({ reason: 'build_id', remoteBuildId: 'r2' });
    await coordinator.apply({
      reason: 'build_id',
      mode: 'policy_deep_recovery',
      forceDeepLock: true,
    });
    expect(fallback).toHaveBeenCalledWith({
      mode: 'policy_deep_recovery',
      reason: 'build_id',
    });
  });

  it('prompt budget blocks second need_refresh for same identity', () => {
    const { coordinator } = makeCoordinator({
      tabGeneration: 'test-gen',
      getApplyEnvironment: () => ({
        hasWaitingWorker: false,
        hasServiceWorkerController: false,
        isStandaloneDisplay: false,
        chunkRecoveryAttempted: false,
      }),
    });
    let events = 0;
    coordinator.subscribeEvents(() => {
      events += 1;
    });
    coordinator.ingestSignal({ reason: 'build_id', remoteBuildId: 'r1' });
    coordinator.ingestSignal({ reason: 'deploy', serverStartedAt: 't-new' });
    expect(events).toBe(1);
    expect(coordinator.getState().status).toBe('pending');
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

  it('acknowledgeHealthy clears pending without snooze', () => {
    const { coordinator, storage } = makeCoordinator();
    coordinator.ingestSignal({ reason: 'build_id', remoteBuildId: 'r1' });
    expect(coordinator.shouldShowBanner()).toBe(true);
    coordinator.acknowledgeHealthy();
    expect(coordinator.getState().status).toBe('idle');
    expect(coordinator.shouldShowBanner()).toBe(false);
    expect(Number(storage.getItem('agentstack:pwa_update_snooze_until') ?? 0)).toBe(0);
  });
});
