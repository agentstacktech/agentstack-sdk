/**

 * Portable Update Plane FSM (`sdk.pwa.update_plane.gen2`).

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

  noteApplyStarted,

  noteDeepRecoveryDone,

  shouldEscalateToDeepRecovery,

  shouldMarkIneffectiveAfterDeepRecovery,

  shouldForceUpdateFromChunkIneffectiveSessions,

} from './appUpdateRecovery';



export type { ApplyAppUpdateMode } from './appUpdateReloadStrategies';



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

  /** Prior user reload failed — offer deep recovery CTA. */

  suggestDeepRecovery?: boolean;

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

    strategy: ReturnType<typeof resolveReloadStrategy>;

  }) => Promise<void>;

  getVisibilityState?: () => DocumentVisibilityState;

  scheduleTimeout?: (fn: () => void, ms: number) => number;

  clearTimeout?: (id: number) => void;

  /** Narrow touch / mobile UA — no auto controller reload, no hidden deploy reload. */

  mobileRelaxedReload?: boolean;

  /** Cross-tab deep recovery leader lock (optional). */

  acquireDeepRecoveryLock?: () => Promise<boolean>;

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

  forceDeepRecovery: () => Promise<void>;

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



  function resolveRecoveryFlags(ev: AppUpdateEvent): {

    ineffectiveSuppressed: boolean;

    suggestDeepRecovery: boolean;

  } {

    if (ev.reason !== 'build_id' || !ev.remoteBuildId) {

      return { ineffectiveSuppressed: false, suggestDeepRecovery: false };

    }

    const identity = buildUpdateIdentity({

      reason: ev.reason,

      localBuildId: config.localBuildId,

      remoteBuildId: ev.remoteBuildId,

    });

    if (isIneffectiveFor(storage, identity)) {

      emitBeacon({ type: 'pwa.update.ineffective_reload', identity });

      return { ineffectiveSuppressed: true, suggestDeepRecovery: false };

    }

    if (shouldMarkIneffectiveAfterDeepRecovery(storage, identity)) {

      markIneffective(storage, identity);

      emitBeacon({ type: 'pwa.update.ineffective_reload', identity });

      return { ineffectiveSuppressed: true, suggestDeepRecovery: false };

    }

    if (shouldEscalateToDeepRecovery(storage, identity)) {

      return { ineffectiveSuppressed: false, suggestDeepRecovery: true };

    }

    return { ineffectiveSuppressed: false, suggestDeepRecovery: false };

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

    if (reasonPriority(ev.reason, priorityTable) < currentPriority && state.status === 'pending') {

      emitBeacon({ type: 'pwa.update.duplicate_suppressed', reason: String(ev.reason) });

      return;

    }



    emitBeacon({ type: 'pwa.update.signal', reason: String(ev.reason) });



    const forceUpdateRequired = computeForceUpdate(ev);

    const recoveryFlags = resolveRecoveryFlags(ev);



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

        ineffectiveSuppressed: recoveryFlags.ineffectiveSuppressed,

        suggestDeepRecovery: recoveryFlags.suggestDeepRecovery,

      });

      return;

    }



    if (recoveryFlags.ineffectiveSuppressed && !forceUpdateRequired) {

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

      suggestDeepRecovery: recoveryFlags.suggestDeepRecovery,

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



    const identity =

      opts.reason === 'build_id' && state.remoteBuildId

        ? buildUpdateIdentity({

            reason: opts.reason,

            localBuildId: config.localBuildId,

            remoteBuildId: state.remoteBuildId,

          })

        : null;



    if (identity && (opts.mode === 'user' || opts.mode === 'policy_deep_recovery')) {

      if (opts.mode === 'user') {

        noteApplyStarted(storage, identity);

      }

      if (opts.mode === 'policy_deep_recovery') {

        noteDeepRecoveryDone(storage, identity);

        emitBeacon({ type: 'pwa.update.deep_recovery', identity });

      }

    }



    setState({

      status: 'applying',

      reason: opts.reason,

      serverStartedAt: opts.serverStartedAt,

      suggestDeepRecovery: false,

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

    try {

      if (opts.mode === 'policy_deep_recovery' && config.acquireDeepRecoveryLock) {

        const acquired = await config.acquireDeepRecoveryLock();

        if (!acquired) return;

      }

      await config.onApply({ ...opts, strategy });

    } finally {

      if (opts.mode === 'user' && typeof window !== 'undefined') {

        scheduleTimeout(() => {

          if (state.status === 'applying') {

            emitBeacon({

              type: 'pwa.update.reload_scheduled',

              reason: String(opts.reason),

              mode: 'user_fallback',

            });

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

          });

        }, APPLY_STUCK_RECOVER_MS);

      }

    }

  }



  async function forceDeepRecovery(): Promise<void> {

    const reason = state.reason ?? 'build_id';

    await apply({ reason, serverStartedAt: state.serverStartedAt, mode: 'policy_deep_recovery' });

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

    dismiss,

    handleChannelMessage,

    scheduleControllerReload,

    clearTimers,

    shouldShowBanner,

    hydrateSnoozeFromStorage,

    forceDeepRecovery,

  };

}



export { clearRecoveryForIdentity, buildUpdateIdentity };


