/**
 * Screen-orientation observable + lock — SDK primitive.
 *
 * Gene: `sdk.mobile.orientation.gen1` · sibling of `sdk.media.gen1`.
 *
 * Why this exists
 * ---------------
 * Mobile-aware UIs (fullscreen photo viewer, camera capture, immersive
 * video players) repeatedly need two device-orientation facts:
 *
 *   1. "Is the screen currently portrait or landscape, at what angle?"
 *      — to lay out UI or recompute zoom math.
 *   2. "Tell me when that changes" — to re-render, to reflow, to adapt.
 *
 * Occasionally they also need (3) **lock** the orientation to a specific
 * mode (landscape-only photo carousel on a fullscreen page, portrait-only
 * camera UI). Locking requires the page to be in fullscreen mode and is
 * only supported on a subset of platforms — the API here reports that
 * feature-detection so callers can gracefully skip.
 *
 * Why `sdk.mobile` (not `sdk.ui`)
 * -------------------------------
 * Orientation is **not** a pure UI concern — it straddles DOM, device
 * hardware, permissions, and platform quirks (iOS Safari requires
 * `DeviceOrientationEvent.requestPermission()` on first touch). Grouping
 * it under `sdk.mobile` gives us room to add sibling primitives later
 * without leaking mobile-specific types into general-purpose namespaces:
 *
 *   - `sdk.mobile.orientation` — this file.
 *   - `sdk.mobile.haptics`     — `navigator.vibrate` + iOS Taptic wrapper.
 *   - `sdk.mobile.wakeLock`    — `navigator.wakeLock` screen-awake.
 *   - `sdk.mobile.safeArea`    — `env(safe-area-inset-*)` with runtime probe.
 *   - `sdk.mobile.share`       — `navigator.share` with clipboard fallback.
 *
 * The pattern: one file per primitive, a slim `index.ts` that wires them
 * into a single `sdk.mobile` object, and a top-level named export so
 * tree-shakable consumers can import just one.
 *
 * Zero-runtime-cost for non-consumers: nothing runs at module scope; the
 * singleton is created lazily on first `createMobileOrientation()` call.
 */

/** Canonical orientation labels mirroring `ScreenOrientation.type`. */
export type OrientationType =
  | 'portrait-primary'
  | 'portrait-secondary'
  | 'landscape-primary'
  | 'landscape-secondary'
  | 'unknown';

/** Snapshot + derived convenience flag. */
export interface OrientationInfo {
  type: OrientationType;
  /** Angle reported by the browser, normalized to 0 / 90 / 180 / 270. */
  angle: number;
  isLandscape: boolean;
}

/** Requested lock modes (mirrors `ScreenOrientation.lock()` values we expose). */
export type OrientationLockType = 'portrait' | 'landscape' | 'any';

export interface OrientationApi {
  /** Current orientation. Returns `{ type: 'unknown', angle: 0 }` in non-DOM. */
  get(): OrientationInfo;
  /**
   * Subscribe to orientation changes. Fires once at subscribe time with
   * the current value. Returns an unsubscribe function — always call it
   * on unmount to avoid leaking listeners across HMR cycles.
   */
  watch(listener: (info: OrientationInfo) => void): () => void;
  /**
   * Request to lock the screen orientation. Resolves on success; rejects
   * with a reason string when unsupported, denied, or called outside
   * fullscreen on platforms that require it. Never throws — always use
   * `.catch()` or `await` with try/catch.
   */
  lock(type: OrientationLockType): Promise<void>;
  /** Release any active lock. Silent when none is held. */
  unlock(): void;
  /** `true` when the `screen.orientation` interface is available. */
  isSupported(): boolean;
  /** `true` when `screen.orientation.lock` is present (subset of supported). */
  isLockSupported(): boolean;
}

/** Detect the active `ScreenOrientation` interface (standard + Safari legacy). */
interface ScreenOrientationLike {
  type?: string;
  angle?: number;
  lock?: (type: string) => Promise<void>;
  unlock?: () => void;
  addEventListener?: (event: string, listener: EventListener) => void;
  removeEventListener?: (event: string, listener: EventListener) => void;
}

function readScreenOrientation(): ScreenOrientationLike | null {
  if (typeof screen === 'undefined') return null;
  const s = screen as Screen & { orientation?: ScreenOrientationLike };
  return s.orientation ?? null;
}

function normalizeAngle(a: number | undefined): number {
  if (typeof a !== 'number' || !Number.isFinite(a)) return 0;
  const mod = ((Math.trunc(a) % 360) + 360) % 360;
  // Snap to canonical rotations — Chrome on dock returns e.g. -90.
  if (mod > 315 || mod <= 45) return 0;
  if (mod > 45 && mod <= 135) return 90;
  if (mod > 135 && mod <= 225) return 180;
  return 270;
}

function snapshot(): OrientationInfo {
  const so = readScreenOrientation();
  if (so && typeof so.type === 'string') {
    const type = so.type as OrientationType;
    const angle = normalizeAngle(so.angle);
    return {
      type,
      angle,
      isLandscape: type === 'landscape-primary' || type === 'landscape-secondary',
    };
  }
  // Fallback heuristic: viewport aspect. Good enough for desktop + browsers
  // that ship without `screen.orientation` (pre-2020 Safari).
  if (typeof window !== 'undefined') {
    const isLandscape = window.innerWidth > window.innerHeight;
    return {
      type: isLandscape ? 'landscape-primary' : 'portrait-primary',
      angle: isLandscape ? 90 : 0,
      isLandscape,
    };
  }
  return { type: 'unknown', angle: 0, isLandscape: false };
}

/**
 * Build a singleton-safe orientation API. Multiple calls return a fresh
 * object that shares the same underlying listener set — listeners are
 * fanned out internally and unsubscribes are per-call.
 */
export function createMobileOrientation(): OrientationApi {
  const listeners = new Set<(info: OrientationInfo) => void>();
  let attached = false;
  const broadcast = () => {
    const info = snapshot();
    for (const l of listeners) {
      try {
        l(info);
      } catch {
        /* one listener shouldn't break the rest */
      }
    }
  };
  const onChange = () => broadcast();

  const attach = () => {
    if (attached) return;
    const so = readScreenOrientation();
    if (so && typeof so.addEventListener === 'function') {
      so.addEventListener('change', onChange);
      attached = true;
      return;
    }
    // Legacy fallback: window orientation events. Safari ≤ 14 dispatches
    // `orientationchange` on window; a `resize` is the universal lower bound.
    if (typeof window !== 'undefined') {
      window.addEventListener('orientationchange', onChange);
      window.addEventListener('resize', onChange);
      attached = true;
    }
  };
  const detach = () => {
    if (!attached) return;
    const so = readScreenOrientation();
    if (so && typeof so.removeEventListener === 'function') {
      so.removeEventListener('change', onChange);
    } else if (typeof window !== 'undefined') {
      window.removeEventListener('orientationchange', onChange);
      window.removeEventListener('resize', onChange);
    }
    attached = false;
  };

  return {
    get: snapshot,

    watch(listener) {
      listeners.add(listener);
      attach();
      // Fire once synchronously so callers don't have to re-read snapshot
      // after subscription — ergonomic for React effects.
      try {
        listener(snapshot());
      } catch {
        /* see above */
      }
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0) detach();
      };
    },

    async lock(type) {
      const so = readScreenOrientation();
      if (!so || typeof so.lock !== 'function') {
        throw new Error('orientation_lock_unsupported');
      }
      try {
        await so.lock(type);
      } catch (err) {
        // Normalize DOMException → plain Error so callers can match text.
        const msg = err instanceof Error ? err.message : 'orientation_lock_failed';
        throw new Error(msg);
      }
    },

    unlock() {
      const so = readScreenOrientation();
      if (so && typeof so.unlock === 'function') {
        try {
          so.unlock();
        } catch {
          /* noop */
        }
      }
    },

    isSupported() {
      return readScreenOrientation() !== null || typeof window !== 'undefined';
    },

    isLockSupported() {
      const so = readScreenOrientation();
      return !!(so && typeof so.lock === 'function');
    },
  };
}

/**
 * Default shared instance. Created lazily on first access; zero cost until
 * then. Consumers that need isolated listeners can still call
 * `createMobileOrientation()` to get a fresh instance.
 */
let shared: OrientationApi | null = null;
export function getMobileOrientation(): OrientationApi {
  if (!shared) shared = createMobileOrientation();
  return shared;
}
