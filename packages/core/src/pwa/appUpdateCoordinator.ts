/**
 * Portable Update Plane FSM (`sdk.pwa.update_plane.gen2`).
 */
import type { AppUpdateBroadcastBridge } from './appUpdateBroadcast';
import type { AppUpdateChannelMsg } from './appUpdateBroadcast';
import type { AppUpdateBeaconEvent } from './appUpdateBeaconTypes';
import type { AppUpdateReason, AppUpdateCoreReason } from './appUpdatePlane';
import { isCoreAppUpdateReason as isCoreReason } from './appUpdatePlane';
import type { ApplyAppUpdateMode } from './appUpdateReloadStrategies';
import {
  resolveReloadStrategy,
  shouldBustPersistOnApply,
} from './appUpdateReloadStrategies';

export type { ApplyAppUpdateMode } from './appUpdateReloadStrategies';

export type AppUpdateStatus = 'idle' | 'pending' | 'applying' | 'snoozed';

export type AppUpdateState = {
  status: AppUpdateStatus;
  reason: AppUpdateReason | null;
  serverStartedAt?: string;
  remoteBuildId?: string;
  detectedAt: number;
  snoozeUntil?: number;
};

export type AppUpdateEvent = {
  reason: AppUpdateReason;
  serverStartedAt?: string;
};

export type SessionStorageLike = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};

export type AppUpdateCoordinatorConfig = {
  localBuildId: string;
  reasonPriority?: Partial<Record<AppUpdateCoreReason, number>>;
  snoozeMs?: number;
  criticalDeferMs?: number;
  bgReloadDelayMs?: number;
  controllerReloadDelayMs?: number;
  snoozeStorageKey?: string;
  storage?: SessionStorageLike | null;
  broadcast?: AppUpdateBroadcastBridge | null;
  onBeacon?: (event: AppUpdateBeaconEvent) => void;
  onPersistBust?: () => void;
  onApply: (opts: {
    reason: AppUpdateReason;
    serverStartedAt?: string;
    mode: ApplyAppUpdateMode;
    strategy: ReturnType<typeof resolveReloadStrategy>;
  }) => Promise<void>;
  getVisibilityState?: () => DocumentVisibilityState;
  scheduleTimeout?: (fn: () => void, ms: number) => number;
  clearTimeout?: (id: number) => void;
  /** Narrow touch / mobile UA — no auto controller reload, no hidden deploy reload. */
  mobileRelaxedReload?: boolean;
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

function reasonPriority(
  reason: AppUpdateReason,
  table: Partial<Record<AppUpdateCoreReason, number>>,
): number {
  if (isCoreReason(reason)) return table[reason] ?? DEFAULT_PRIORITY[reason];
  return 1;
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
  }) => Promise<void>;
  dismiss: (snooze?: boolean) => void;
  handleChannelMessage: (msg: AppUpdateChannelMsg) => void;
  scheduleControllerReload: () => void;
  clearTimers: () => void;
  shouldShowBanner: () => boolean;
  hydrateSnoozeFromStorage: () => void;
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
  const storage = config.storage ?? null;
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

  function isSnoozed(reason: AppUpdateReason): boolean {
    const until = state.snoozeUntil ?? readSnoozeUntil();
    if (until <= Date.now()) return false;
    if (reason === 'deploy' || reason === 'build_id') {
      return state.status === 'snoozed' && state.reason === reason;
    }
    return true;
  }

  function broadcastSignal(ev: AppUpdateEvent): void {
    config.broadcast?.post({
      type: 'signal',
      reason: ev.reason,
      serverStartedAt: ev.serverStartedAt,
      buildId: config.localBuildId,
      detectedAt: Date.now(),
    });
  }

  function ingestSignal(ev: AppUpdateEvent, fromRemote = false): void {
    const key = `${ev.reason}:${ev.serverStartedAt ?? ''}:${config.localBuildId}`;
    if (key === lastEmittedKey && !fromRemote) {
      emitBeacon({ type: 'pwa.update.duplicate_suppressed', reason: String(ev.reason) });
      return;
    }
    lastEmittedKey = key;

    const currentPriority = state.reason ? reasonPriority(state.reason, priorityTable) : 0;
    if (reasonPriority(ev.reason, priorityTable) < currentPriority && state.status === 'pending') {
      emitBeacon({ type: 'pwa.update.duplicate_suppressed', reason: String(ev.reason) });
      return;
    }

    emitBeacon({ type: 'pwa.update.signal', reason: String(ev.reason) });

    if (isSnoozed(ev.reason)) {
      setState({
        status: 'snoozed',
        reason: ev.reason,
        serverStartedAt: ev.serverStartedAt,
        detectedAt: Date.now(),
        snoozeUntil: state.snoozeUntil ?? readSnoozeUntil(),
      });
      return;
    }

    setState({
      status: 'pending',
      reason: ev.reason,
      serverStartedAt: ev.serverStartedAt,
      detectedAt: Date.now(),
    });

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
  }): Promise<void> {
    clearTimers();

    setState({
      status: 'applying',
      reason: opts.reason,
      serverStartedAt: opts.serverStartedAt,
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
    await config.onApply({ ...opts, strategy });
  }

  function dismiss(snooze = true): void {
    if (!state.reason) return;
    const reason = state.reason;
    if (reason === 'deploy' || reason === 'build_id') {
      const snoozeUntil = Date.now() + criticalDeferMs;
      writeSnoozeUntil(snoozeUntil);
      setState({ status: 'snoozed', reason, snoozeUntil, detectedAt: Date.now() });
      config.broadcast?.post({ type: 'dismiss', snoozeUntil, reason });
      return;
    }
    const snoozeUntil = snooze ? Date.now() + snoozeMs : 0;
    if (snooze) writeSnoozeUntil(snoozeUntil);
    setState({ status: 'snoozed', snoozeUntil, reason, detectedAt: Date.now() });
    config.broadcast?.post({ type: 'dismiss', snoozeUntil, reason });
  }

  function handleChannelMessage(msg: AppUpdateChannelMsg): void {
    if (msg.type === 'signal') {
      ingestSignal({ reason: msg.reason, serverStartedAt: msg.serverStartedAt }, true);
      return;
    }
    if (msg.type === 'dismiss') {
      setState({
        status: 'snoozed',
        reason: msg.reason,
        snoozeUntil: msg.snoozeUntil,
        detectedAt: Date.now(),
      });
      writeSnoozeUntil(msg.snoozeUntil);
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
    if (state.status !== 'pending') return false;
    if (!state.reason) return false;
    return !isSnoozed(state.reason);
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
    dismiss,
    handleChannelMessage,
    scheduleControllerReload,
    clearTimers,
    shouldShowBanner,
    hydrateSnoozeFromStorage,
  };
}
