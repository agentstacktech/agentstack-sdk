/**
 * `sdk.mobile.*` — mobile-specific primitives.
 *
 * Gene: `sdk.mobile.gen1`.
 *
 * The namespace groups features that only make sense on touch / handheld
 * contexts, or that require platform-specific feature-detection (iOS
 * permission prompts, Android Chrome quirks). Each primitive is lazy:
 * modules run no code until first accessed, so `sdk.mobile` costs nothing
 * for desktop-only consumers.
 *
 * Current surface:
 *   - `orientation` — screen-orientation observable + lock.
 *   - `deviceCapability` / `networkPolicy` / `cooperativeQueue` — mobile boot & update policy.
 *
 * Roadmap (deliberately not shipped yet — add here when needed):
 *   - `haptics` — `navigator.vibrate` + iOS Taptic wrapper.
 *   - `wakeLock` — screen awake during fullscreen video / camera.
 *   - `safeArea` — `env(safe-area-inset-*)` runtime probe with fallbacks.
 *   - `share` — `navigator.share` with clipboard fallback.
 *   - `visualViewport` — software-keyboard-aware scroll helpers.
 */

export type {
  OrientationApi,
  OrientationInfo,
  OrientationLockType,
  OrientationType,
} from './orientation';
export {
  createMobileOrientation,
  getMobileOrientation,
} from './orientation';

export type { DeviceCapabilityProfile } from './deviceCapability';
export { getDeviceCapabilityProfile } from './deviceCapability';
export type { NetworkPolicy } from './networkPolicy';
export { getNetworkPolicy } from './networkPolicy';
export type { WorkPriority, ScheduledWork } from './cooperativeQueue';
export {
  scheduleCooperativeWork,
  flushCooperativeWork,
  getCooperativeQueueDepth,
  clearCooperativeQueue,
} from './cooperativeQueue';

export type { ScheduleIdleWorkOptions } from './cooperativeQueue';
export { scheduleIdleWork } from './cooperativeQueue';

import { getMobileOrientation } from './orientation';

export interface MobileSurface {
  /** Screen-orientation observable + lock API. */
  orientation: ReturnType<typeof getMobileOrientation>;
}

/**
 * Build the `sdk.mobile` surface. Kept as a factory so the SDK constructor
 * can call it eagerly (nearly zero cost — one object literal), while
 * tree-shakable consumers can still import just the primitive they need.
 */
export function createMobileSurface(): MobileSurface {
  return {
    orientation: getMobileOrientation(),
  };
}
