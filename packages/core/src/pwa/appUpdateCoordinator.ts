/**
 * Portable Update Plane FSM (`sdk.pwa.update_plane.gen2`).
 * Strategy Ladder L0–L2 + PromptBudget (ADR PWA_UPDATE_ORCHESTRATION_V2.3).
 */
import type { AppUpdateBroadcastBridge } from './appUpdateBroadcast';
import type { AppUpdateChannelMsg } from './appUpdateBroadcast';
import type { AppUpdateBeaconEvent } from './appUpdateBeaconTypes';
import { isBuildIdBelowMinSupported } from './buildId';
import type { AppUpdateReason, AppUpdateCoreReason, ProbeStaticBuildSource } from './appUpdatePlane';
import { isCoreAppUpdateReason as isCoreReason } from './appUpdatePlane';
import type { ApplyAppUpdateMode } from './appUpdateReloadStrategies';
import {
  resolveReloadStrategy,
  shouldBustPersistOnApply,
} from './appUpdateReloadStrategies';
import {
  buildUpdateIdentity,
  clearRecoveryForIdentity,
  isIneffectiveFor,
  markIneffective,
  markPromptShown,
  noteTierAttempt,
  shouldEscalateToDeepRecovery,
  shouldMarkIneffectiveAfterDeepRecovery,
  shouldForceUpdateFromChunkIneffectiveSessions,
} from './appUpdateRecovery';
import type { ApplyEnvironmentHints, UpdateTier } from './appUpdateStrategyLadder';
import {
  DEFAULT_APPLY_ENVIRONMENT,
  applyModeToTier,
  resolveSelectedTier,
  tierToApplyMode,
} from './appUpdateStrategyLadder';

export type { ApplyAppUpdateMode } from './appUpdateReloadStrategies';
export type { UpdateTier } from './appUpdateStrategyLadder';

export type AppUpdateStatus = 'idle' | 'pending' | 'applying' | 'snoozed';

export type AppUpdateState = {
  status: AppUpdateStatus;
  reason: AppUpdateReason | null;
  serverStartedAt?: string;
  remoteBuildId?: string;
  detectedAt: number;
  snoozeUntil?: number;
  probeSource?: ProbeStaticBuildSource;
  /** Server min supported build (from build-meta.json). */
  minSupportedBuildId?: string | null;
  /** Client must update — dismiss blocked. */
  forceUpdateRequired?: boolean;
  /** Reload/deep recovery did not help — hide blocking banner. */
  ineffectiveSuppressed?: boolean;
  /**
   * Compat: true when selectedTier === 2.
   * Prefer `selectedTier` for new UI.
   */
  suggestDeepRecovery?: boolean;
  /** Predictive Strategy Ladder tier (0/1/2). */
  selectedTier?: UpdateTier;
  /** Frozen display reason after first pending (silent upgrades still update `reason`). */
  frozenReason?: AppUpdateReason | null;
};

export type AppUpdateEvent = {
  reason: AppUpdateReason;
  serverStartedAt?: string;
  /** Origin build id when reason is `build_id`. */
  remoteBuildId?: string;
  probeSource?: ProbeStaticBuildSource;
  minSupportedBuildId?: string | null;
  remoteBuiltAt?: string | null;
};

export type SessionStorageLike = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem?: (key: string) => void;
};

export type AppUpdateCoordinatorConfig = {
  localBuildId: string;
  /** ISO timestamp baked into bundle at build time (force-update floor). */
  localBuiltAt?: string | null;
  reasonPriority?: Partial<Record<AppUpdateCoreReason, number>>;
  snoozeMs?: number;
  criticalDeferMs?: number;
  bgReloadDelayMs?: number;
  controllerReloadDelayMs?: number;
  snoozeStorageKey?: string;
  snoozeIdentityStorageKey?: string;
  storage?: SessionStorageLike | null;
  broadcast?: AppUpdateBroadcastBridge | null;
  onBeacon?: (event: AppUpdateBeaconEvent) => void;
  onPersistBust?: () => void;
  onApply: (opts: {
    reason: AppUpdateReason;
    serverStartedAt?: string;
    mode: ApplyAppUpdateMode;
    selectedTier: UpdateTier;
    strategy: ReturnType<typeof resolveReloadStrategy>;
  }) => Promise<void>;
  /** Last-resort navigation when strategy did not unload the page (2.5s). */
  onNavigationFallback?: (opts: {
    mode: ApplyAppUpdateMode;
    reason: AppUpdateReason;
  }) => void;
  getVisibilityState?: () => DocumentVisibilityState;
  scheduleTimeout?: (fn: () => void, ms: number) => number;
  clearTimeout?: (id: number) => void;
  /** Narrow touch / mobile UA — no auto controller reload, no hidden deploy reload. */
  mobileRelaxedReload?: boolean;
  /**
   * Cross-tab deep recovery leader lock (optional).
   * Pass `{ force: true }` for an explicit user CTA so a stale 15s stamp cannot
   * roll apply back to pending with no navigation.
   */
  acquireDeepRecoveryLock?: (opts?: { force?: boolean }) => Promise<boolean>;
  /** Environment hints for predictive ladder (SW / standalone / chunk). */
  getApplyEnvironment?: () => ApplyEnvironmentHints;
  /** Tab boot generation for PromptBudget (default stable per coordinator instance). */
  tabGeneration?: string;
};

const DEFAULT_PRIORITY: Record<AppUpdateCoreReason, number> = {
  deploy: 4,
  build_id: 3,
  sw_waiting: 2,
  stale_assets: 1,
};

const DEFAULT_SNOOZE_MS = 24 * 60 * 60 * 1000;
const DEFAULT_CRITICAL_DEFER_MS = 15 * 60 * 1000;
const DEFAULT_BG_RELOAD_MS = 10_000;
const DEFAULT_CONTROLLER_MS = 120;
const DEFAULT_SNOOZE_KEY = 'agentstack:pwa_update_snooze_until';
const DEFAULT_SNOOZE_IDENTITY_KEY = 'agentstack:pwa_update_snooze_identity';
const APPLY_STUCK_RECOVER_MS = 3_000;

function reasonPriority(
  reason: AppUpdateReason,
  table: Partial<Record<AppUpdateCoreReason, number>>,
): number {
  if (isCoreReason(reason)) return table[reason] ?? DEFAULT_PRIORITY[reason];
  return 1;
}

function eventIdentity(
  ev: AppUpdateEvent,
  localBuildId: string,
): string {
  return buildUpdateIdentity({
    reason: ev.reason,
    localBuildId,
    remoteBuildId: ev.remoteBuildId,
    serverStartedAt: ev.serverStartedAt,
  });
}

export type AppUpdateCoordinator = {
  getState: () => AppUpdateState;
  subscribeState: (listener: (state: AppUpdateState) => void) => () => void;
  subscribeEvents: (listener: (ev: AppUpdateEvent) => void) => () => void;
  ingestSignal: (ev: AppUpdateEvent, fromRemote?: boolean) => void;
  apply: (opts: {
    reason: AppUpdateReason;
    serverStartedAt?: string;
    mode: ApplyAppUpdateMode;
    forceDeepLock?: boolean;
  }) => Promise<void>;
  /** User CTA — uses selectedTier → mode. */
  applyEffective: () => Promise<void>;
  dismiss: (snooze?: boolean) => void;
  handleChannelMessage: (msg: AppUpdateChannelMsg) => void;
  scheduleControllerReload: () => void;
  clearTimers: () => void;
  shouldShowBanner: () => boolean;
  hydrateSnoozeFromStorage: () => void;
  forceDeepRecovery: () => Promise<void>;
  /** Probe confirmed local matches remote — clear pending without snooze. */
  acknowledgeHealthy: () => void;
};

export function createAppUpdateCoordinator(config: AppUpdateCoordinatorConfig): AppUpdateCoordinator {
  const priorityTable = { ...DEFAULT_PRIORITY, ...config.reasonPriority };
  const snoozeMs = config.snoozeMs ?? DEFAULT_SNOOZE_MS;
  const criticalDeferMs = config.criticalDeferMs ?? DEFAULT_CRITICAL_DEFER_MS;
  const mobileRelaxed = config.mobileRelaxedReload === true;
  const bgReloadDelayMs = mobileRelaxed
    ? Number.MAX_SAFE_INTEGER
    : (config.bgReloadDelayMs ?? DEFAULT_BG_RELOAD_MS);
  const controllerReloadDelayMs = mobileRelaxed
    ? Number.MAX_SAFE_INTEGER
    : (config.controllerReloadDelayMs ?? DEFAULT_CONTROLLER_MS);
  const snoozeKey = config.snoozeStorageKey ?? DEFAULT_SNOOZE_KEY;
  const snoozeIdentityKey = config.snoozeIdentityStorageKey ?? DEFAULT_SNOOZE_IDENTITY_KEY;
  const storage = config.storage ?? null;
  const tabGeneration = config.tabGeneration ?? `gen-${Date.now()}`;
  const getVisibility =
    config.getVisibilityState ??
    (() =>
      typeof document !== 'undefined' ? document.visibilityState : ('visible' as DocumentVisibilityState));
  const scheduleTimeout =
    config.scheduleTimeout ??
    ((fn: () => void, ms: number) =>
      typeof window !== 'undefined' ? window.setTimeout(fn, ms) : (0 as unknown as number));
  const clearScheduleTimeout =
    config.clearTimeout ??
    ((id: number) => {
      if (typeof window !== 'undefined') window.clearTimeout(id);
    });
  const readEnv = (): ApplyEnvironmentHints => {
    try {
      return { ...DEFAULT_APPLY_ENVIRONMENT, ...config.getApplyEnvironment?.() };
    } catch {
      return { ...DEFAULT_APPLY_ENVIRONMENT };
    }
  };

  const eventListeners = new Set<(ev: AppUpdateEvent) => void>();
  const stateListeners = new Set<(state: AppUpdateState) => void>();
  let lastEmittedKey = '';
  let state: AppUpdateState = { status: 'idle', reason: null, detectedAt: 0 };
  let bgReloadTimer: number | null = null;
  let controllerReloadTimer: number | null = null;
  const emitBeacon = (event: AppUpdateBeaconEvent) => config.onBeacon?.(event);

  function readSnoozeUntil(): number {
    if (!storage) return 0;
    try {
      return Number(storage.getItem(snoozeKey) ?? 0);
    } catch {
      return 0;
    }
  }

  function writeSnoozeUntil(until: number): void {
    if (!storage) return;
    try {
      storage.setItem(snoozeKey, String(until));
    } catch {
      /* ignore */
    }
  }

  function snoozeIdentity(ev: AppUpdateEvent): string {
    return `${ev.reason}:${ev.serverStartedAt ?? ''}:${ev.remoteBuildId ?? ''}`;
  }

  function readSnoozeIdentity(): string {
    if (!storage) return '';
    try {
      return storage.getItem(snoozeIdentityKey) ?? '';
    } catch {
      return '';
    }
  }

  function writeSnoozeIdentity(identity: string): void {
    if (!storage) return;
    try {
      storage.setItem(snoozeIdentityKey, identity);
    } catch {
      /* ignore */
    }
  }

  function emitState(): void {
    stateListeners.forEach((fn) => fn(state));
  }

  function setState(patch: Partial<AppUpdateState>): void {
    const prev = state.status;
    state = { ...state, ...patch };
    if (prev !== state.status || patch.reason != null) {
      emitBeacon({
        type: 'pwa.update.state_transition',
        from: prev,
        to: state.status,
        reason: state.reason ?? '',
      });
    }
    emitState();
  }

  function computeForceUpdate(ev: AppUpdateEvent): boolean {
    const persistentStorage =
      typeof localStorage !== 'undefined' ? localStorage : null;
    if (shouldForceUpdateFromChunkIneffectiveSessions(persistentStorage)) {
      emitBeacon({
        type: 'pwa.update.force_floor',
        local: config.localBuildId,
        min: 'chunk_recovery',
      });
      return true;
    }
    if (ev.reason !== 'build_id' || !ev.remoteBuildId) return false;
    const min = ev.minSupportedBuildId ?? null;
    if (
      isBuildIdBelowMinSupported(
        config.localBuildId,
        min,
        config.localBuiltAt ?? null,
        ev.remoteBuiltAt ?? null,
      )
    ) {
      emitBeacon({ type: 'pwa.update.force_floor', local: config.localBuildId, min: min ?? '' });
      return true;
    }
    return false;
  }

  function resolveSessionFlags(ev: AppUpdateEvent): {
    ineffectiveSuppressed: boolean;
    suggestDeepRecovery: boolean;
    selectedTier: UpdateTier;
    identity: string;
  } {
    const identity = eventIdentity(ev, config.localBuildId);
    const env = readEnv();
    const priorTierFailed = shouldEscalateToDeepRecovery(storage, identity);

    if (isIneffectiveFor(storage, identity)) {
      emitBeacon({ type: 'pwa.update.ineffective_reload', identity });
      return {
        ineffectiveSuppressed: true,
        suggestDeepRecovery: false,
        selectedTier: 2,
        identity,
      };
    }
    if (shouldMarkIneffectiveAfterDeepRecovery(storage, identity)) {
      markIneffective(storage, identity);
      emitBeacon({ type: 'pwa.update.ineffective_reload', identity });
      return {
        ineffectiveSuppressed: true,
        suggestDeepRecovery: false,
        selectedTier: 2,
        identity,
      };
    }

    const coreReason: AppUpdateCoreReason = isCoreReason(ev.reason)
      ? ev.reason
      : 'stale_assets';

    const selectedTier = resolveSelectedTier({
      reason: coreReason,
      hasWaitingWorker: env.hasWaitingWorker,
      hasServiceWorkerController: env.hasServiceWorkerController,
      isStandaloneDisplay: env.isStandaloneDisplay,
      chunkRecoveryAttempted: env.chunkRecoveryAttempted,
      priorTierFailed,
    });

    emitBeacon({
      type: 'pwa.update.tier_chosen',
      tier: selectedTier,
      reason: String(ev.reason),
      predicted: true,
    });

    return {
      ineffectiveSuppressed: false,
      suggestDeepRecovery: selectedTier === 2,
      selectedTier,
      identity,
    };
  }

  function isSnoozed(ev: AppUpdateEvent): boolean {
    const until = state.snoozeUntil ?? readSnoozeUntil();
    if (until <= Date.now()) return false;
    if (ev.reason === 'deploy' || ev.reason === 'build_id') {
      const identity = snoozeIdentity(ev);
      const storedIdentity = readSnoozeIdentity();
      return (
        state.status === 'snoozed' &&
        state.reason === ev.reason &&
        (storedIdentity === '' || storedIdentity === identity)
      );
    }
    return true;
  }

  function broadcastSignal(ev: AppUpdateEvent): void {
    config.broadcast?.post({
      type: 'signal',
      reason: ev.reason,
      serverStartedAt: ev.serverStartedAt,
      remoteBuildId: ev.remoteBuildId,
      buildId: config.localBuildId,
      detectedAt: Date.now(),
    });
  }

  function ingestSignal(ev: AppUpdateEvent, fromRemote = false): void {
    if (state.status === 'applying') {
      emitBeacon({ type: 'pwa.update.duplicate_suppressed', reason: 'applying_in_flight' });
      return;
    }

    if (
      ev.reason === 'build_id' &&
      ev.remoteBuildId &&
      state.remoteBuildId === ev.remoteBuildId &&
      (state.status === 'pending' || state.status === 'snoozed' || state.status === 'applying')
    ) {
      emitBeacon({ type: 'pwa.update.duplicate_suppressed', reason: 'build_id_same_remote' });
      return;
    }

    const key = `${ev.reason}:${ev.serverStartedAt ?? ''}:${ev.remoteBuildId ?? ''}:${config.localBuildId}`;
    if (key === lastEmittedKey && !fromRemote) {
      emitBeacon({ type: 'pwa.update.duplicate_suppressed', reason: String(ev.reason) });
      return;
    }
    lastEmittedKey = key;

    const currentPriority = state.reason ? reasonPriority(state.reason, priorityTable) : 0;
    const nextPriority = reasonPriority(ev.reason, priorityTable);
    if (nextPriority < currentPriority && state.status === 'pending') {
      emitBeacon({ type: 'pwa.update.duplicate_suppressed', reason: String(ev.reason) });
      return;
    }

    const session = resolveSessionFlags(ev);
    const forceUpdateRequired = computeForceUpdate(ev);

    // Already pending: silent upgrade / budget — never a second need_refresh pulse
    if (state.status === 'pending') {
      const fromReason = state.reason;
      if (nextPriority < currentPriority) {
        emitBeacon({ type: 'pwa.update.duplicate_suppressed', reason: String(ev.reason) });
        return;
      }
      if (fromReason && fromReason !== ev.reason && nextPriority > currentPriority) {
        emitBeacon({
          type: 'pwa.update.reason_upgraded',
          from: String(fromReason),
          to: String(ev.reason),
        });
      }
      setState({
        reason: nextPriority >= currentPriority ? ev.reason : state.reason,
        serverStartedAt: ev.serverStartedAt ?? state.serverStartedAt,
        remoteBuildId: ev.remoteBuildId ?? state.remoteBuildId,
        probeSource: ev.probeSource ?? state.probeSource,
        minSupportedBuildId: ev.minSupportedBuildId ?? state.minSupportedBuildId,
        forceUpdateRequired: forceUpdateRequired || state.forceUpdateRequired,
        selectedTier: session.selectedTier,
        suggestDeepRecovery: session.suggestDeepRecovery,
        frozenReason: state.frozenReason ?? state.reason,
        detectedAt: Date.now(),
        ineffectiveSuppressed: false,
      });
      emitBeacon({ type: 'pwa.update.prompt_budget_hit', identity: session.identity });
      emitBeacon({ type: 'pwa.update.second_banner_blocked', identity: session.identity });
      return;
    }

    emitBeacon({ type: 'pwa.update.signal', reason: String(ev.reason) });

    if (isSnoozed(ev) && !forceUpdateRequired) {
      setState({
        status: 'snoozed',
        reason: ev.reason,
        serverStartedAt: ev.serverStartedAt,
        remoteBuildId: ev.remoteBuildId ?? state.remoteBuildId,
        detectedAt: Date.now(),
        snoozeUntil: state.snoozeUntil ?? readSnoozeUntil(),
        probeSource: ev.probeSource ?? state.probeSource,
        minSupportedBuildId: ev.minSupportedBuildId ?? state.minSupportedBuildId,
        forceUpdateRequired,
        ineffectiveSuppressed: session.ineffectiveSuppressed,
        suggestDeepRecovery: session.suggestDeepRecovery,
        selectedTier: session.selectedTier,
        frozenReason: state.frozenReason ?? ev.reason,
      });
      return;
    }

    if (session.ineffectiveSuppressed && !forceUpdateRequired) {
      setState({
        status: 'idle',
        reason: ev.reason,
        serverStartedAt: ev.serverStartedAt,
        remoteBuildId: ev.remoteBuildId,
        detectedAt: Date.now(),
        probeSource: ev.probeSource,
        minSupportedBuildId: ev.minSupportedBuildId ?? null,
        forceUpdateRequired: false,
        ineffectiveSuppressed: true,
        suggestDeepRecovery: false,
        selectedTier: session.selectedTier,
      });
      return;
    }

    setState({
      status: 'pending',
      reason: ev.reason,
      serverStartedAt: ev.serverStartedAt,
      remoteBuildId: ev.remoteBuildId,
      detectedAt: Date.now(),
      probeSource: ev.probeSource,
      minSupportedBuildId: ev.minSupportedBuildId ?? null,
      forceUpdateRequired,
      ineffectiveSuppressed: false,
      suggestDeepRecovery: session.suggestDeepRecovery,
      selectedTier: session.selectedTier,
      frozenReason: ev.reason,
    });

    markPromptShown(storage, session.identity, tabGeneration);

    if (!fromRemote) broadcastSignal(ev);
    eventListeners.forEach((fn) => fn(ev));

    if (
      !mobileRelaxed &&
      getVisibility() === 'hidden' &&
      ev.reason === 'deploy' &&
      ev.serverStartedAt
    ) {
      if (bgReloadTimer != null) clearScheduleTimeout(bgReloadTimer);
      bgReloadTimer = scheduleTimeout(() => {
        void apply({
          reason: 'deploy',
          serverStartedAt: ev.serverStartedAt,
          mode: 'policy_background',
        });
      }, bgReloadDelayMs);
    }
  }

  async function apply(opts: {
    reason: AppUpdateReason;
    serverStartedAt?: string;
    mode: ApplyAppUpdateMode;
    /** User CTA — overwrite stale deep-recovery lock instead of rolling back. */
    forceDeepLock?: boolean;
  }): Promise<void> {
    clearTimers();

    const identity = buildUpdateIdentity({
      reason: opts.reason,
      localBuildId: config.localBuildId,
      remoteBuildId: state.remoteBuildId,
      serverStartedAt: opts.serverStartedAt ?? state.serverStartedAt,
    });

    const tier =
      opts.mode === 'policy_deep_recovery'
        ? 2
        : opts.mode === 'user' && state.selectedTier != null
          ? state.selectedTier
          : applyModeToTier(opts.mode);
    if (
      opts.mode === 'user' ||
      opts.mode === 'policy_deep_recovery' ||
      opts.mode === 'policy_controller' ||
      opts.mode === 'policy_background'
    ) {
      noteTierAttempt(storage, identity, tier);
      if (opts.mode === 'policy_deep_recovery') {
        emitBeacon({ type: 'pwa.update.deep_recovery', identity });
      }
    }

    setState({
      status: 'applying',
      reason: opts.reason,
      serverStartedAt: opts.serverStartedAt,
      suggestDeepRecovery: false,
      selectedTier: tier,
    });
    config.broadcast?.post({ type: 'applying', reason: opts.reason });
    emitBeacon({
      type: 'pwa.update.reload_scheduled',
      reason: String(opts.reason),
      mode: opts.mode,
    });
    if (shouldBustPersistOnApply(opts.reason, opts.mode)) {
      config.onPersistBust?.();
    }
    const strategy = resolveReloadStrategy(opts.mode);
    // Capture for fallback: probes must not cancel navigation via acknowledgeHealthy.
    let expectNavigationFallback =
      (opts.mode === 'user' || opts.mode === 'policy_deep_recovery') &&
      (typeof window !== 'undefined' || Boolean(config.onNavigationFallback));
    try {
      if (opts.mode === 'policy_deep_recovery' && config.acquireDeepRecoveryLock) {
        const acquired = await config.acquireDeepRecoveryLock({
          force: opts.forceDeepLock === true,
        });
        if (!acquired) {
          expectNavigationFallback = false;
          emitBeacon({
            type: 'pwa.update.duplicate_suppressed',
            reason: 'deep_recovery_lock_busy',
          });
          setState({
            status: 'pending',
            reason: opts.reason,
            serverStartedAt: opts.serverStartedAt,
            detectedAt: Date.now(),
            selectedTier: 2,
            suggestDeepRecovery: true,
          });
          return;
        }
      }
      await config.onApply({ ...opts, strategy, selectedTier: tier });
    } finally {
      if (expectNavigationFallback) {
        const fallbackMode = opts.mode;
        const fallbackReason = opts.reason;
        scheduleTimeout(() => {
          // Always navigate if apply started — do not require status==='applying'
          // (healthy probe used to call acknowledgeHealthy and cancel reload).
          emitBeacon({
            type: 'pwa.update.reload_scheduled',
            reason: String(fallbackReason),
            mode: 'user_fallback',
          });
          if (config.onNavigationFallback) {
            config.onNavigationFallback({ mode: fallbackMode, reason: fallbackReason });
          } else if (typeof window !== 'undefined') {
            window.location.reload();
          }
        }, 2500);
      } else if (state.status === 'applying') {
        scheduleTimeout(() => {
          if (state.status !== 'applying') return;
          emitBeacon({
            type: 'pwa.update.state_transition',
            from: 'applying',
            to: 'pending',
            reason: 'apply_stuck_recovered',
          });
          setState({
            status: 'pending',
            reason: opts.reason,
            serverStartedAt: opts.serverStartedAt,
            detectedAt: Date.now(),
            selectedTier: state.selectedTier,
            suggestDeepRecovery: state.selectedTier === 2,
          });
        }, APPLY_STUCK_RECOVER_MS);
      }
    }
  }

  async function applyEffective(): Promise<void> {
    if (state.status === 'applying') return;
    const reason = state.reason ?? 'sw_waiting';
    const tier = state.selectedTier ?? 1;
    const mode = tierToApplyMode(tier);
    await apply({
      reason,
      serverStartedAt: state.serverStartedAt,
      mode,
      forceDeepLock: true,
    });
  }

  async function forceDeepRecovery(): Promise<void> {
    if (state.status === 'applying') return;
    const reason = state.reason ?? 'build_id';
    await apply({
      reason,
      serverStartedAt: state.serverStartedAt,
      mode: 'policy_deep_recovery',
      forceDeepLock: true,
    });
  }

  function acknowledgeHealthy(): void {
    clearTimers();
    lastEmittedKey = '';
    setState({
      status: 'idle',
      reason: null,
      detectedAt: Date.now(),
      remoteBuildId: undefined,
      serverStartedAt: undefined,
      forceUpdateRequired: false,
      ineffectiveSuppressed: false,
      suggestDeepRecovery: false,
      selectedTier: undefined,
      frozenReason: null,
    });
  }

  function dismiss(snooze = true): void {
    if (!state.reason) return;
    if (state.forceUpdateRequired) return;
    const reason = state.reason;
    const ev: AppUpdateEvent = {
      reason,
      serverStartedAt: state.serverStartedAt,
      remoteBuildId: state.remoteBuildId,
    };
    if (reason === 'deploy' || reason === 'build_id') {
      const snoozeUntil = Date.now() + criticalDeferMs;
      writeSnoozeUntil(snoozeUntil);
      writeSnoozeIdentity(snoozeIdentity(ev));
      setState({
        status: 'snoozed',
        reason,
        snoozeUntil,
        serverStartedAt: state.serverStartedAt,
        remoteBuildId: state.remoteBuildId,
        detectedAt: Date.now(),
        ineffectiveSuppressed: false,
        suggestDeepRecovery: false,
      });
      config.broadcast?.post({
        type: 'dismiss',
        snoozeUntil,
        reason,
        serverStartedAt: state.serverStartedAt,
        remoteBuildId: state.remoteBuildId,
      });
      return;
    }
    const snoozeUntil = snooze ? Date.now() + snoozeMs : 0;
    if (snooze) writeSnoozeUntil(snoozeUntil);
    setState({
      status: 'snoozed',
      snoozeUntil,
      reason,
      serverStartedAt: state.serverStartedAt,
      remoteBuildId: state.remoteBuildId,
      detectedAt: Date.now(),
    });
    config.broadcast?.post({
      type: 'dismiss',
      snoozeUntil,
      reason,
      serverStartedAt: state.serverStartedAt,
      remoteBuildId: state.remoteBuildId,
    });
  }

  function handleChannelMessage(msg: AppUpdateChannelMsg): void {
    if (msg.type === 'signal') {
      ingestSignal(
        {
          reason: msg.reason,
          serverStartedAt: msg.serverStartedAt,
          remoteBuildId: msg.remoteBuildId,
        },
        true,
      );
      return;
    }
    if (msg.type === 'dismiss') {
      const ev: AppUpdateEvent = {
        reason: msg.reason,
        serverStartedAt: msg.serverStartedAt,
        remoteBuildId: msg.remoteBuildId,
      };
      setState({
        status: 'snoozed',
        reason: msg.reason,
        snoozeUntil: msg.snoozeUntil,
        serverStartedAt: msg.serverStartedAt,
        remoteBuildId: msg.remoteBuildId,
        detectedAt: Date.now(),
      });
      writeSnoozeUntil(msg.snoozeUntil);
      writeSnoozeIdentity(snoozeIdentity(ev));
      return;
    }
    if (msg.type === 'applying') {
      setState({ status: 'applying', reason: msg.reason, detectedAt: Date.now() });
    }
  }

  function scheduleControllerReload(): void {
    emitBeacon({ type: 'pwa.update.controllerchange' });
    if (mobileRelaxed) return;
    if (controllerReloadTimer != null) clearScheduleTimeout(controllerReloadTimer);
    controllerReloadTimer = scheduleTimeout(() => {
      if (getVisibility() !== 'visible') return;
      if (state.status !== 'pending' && state.status !== 'applying') return;
      const reason = state.reason;
      if (reason !== 'sw_waiting' && reason !== 'build_id') return;
      void apply({
        reason: reason ?? 'sw_waiting',
        serverStartedAt: state.serverStartedAt,
        mode: 'policy_controller',
      });
    }, controllerReloadDelayMs);
  }

  function clearTimers(): void {
    if (bgReloadTimer != null) {
      clearScheduleTimeout(bgReloadTimer);
      bgReloadTimer = null;
    }
    if (controllerReloadTimer != null) {
      clearScheduleTimeout(controllerReloadTimer);
      controllerReloadTimer = null;
    }
  }

  function shouldShowBanner(): boolean {
    if (state.ineffectiveSuppressed && !state.forceUpdateRequired) return false;
    if (state.status !== 'pending') return false;
    if (!state.reason) return false;
    return !isSnoozed({
      reason: state.reason,
      serverStartedAt: state.serverStartedAt,
      remoteBuildId: state.remoteBuildId,
    });
  }

  function hydrateSnoozeFromStorage(): void {
    const until = readSnoozeUntil();
    if (until > Date.now()) {
      setState({ status: 'snoozed', snoozeUntil: until, detectedAt: Date.now() });
    }
  }

  return {
    /** Stable reference until `setState` — required for React `useSyncExternalStore`. */
    getState: () => state,
    subscribeState: (listener) => {
      stateListeners.add(listener);
      listener(state);
      return () => stateListeners.delete(listener);
    },
    subscribeEvents: (listener) => {
      eventListeners.add(listener);
      return () => eventListeners.delete(listener);
    },
    ingestSignal,
    apply,
    applyEffective,
    dismiss,
    handleChannelMessage,
    scheduleControllerReload,
    clearTimers,
    shouldShowBanner,
    hydrateSnoozeFromStorage,
    forceDeepRecovery,
    acknowledgeHealthy,
  };
}

export { clearRecoveryForIdentity, buildUpdateIdentity };
