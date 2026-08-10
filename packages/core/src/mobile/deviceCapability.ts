/**
 * Device capability probe (`sdk.mobile.gen1`).
 */

export type DeviceCapabilityProfile = {
  isMobileUa: boolean;
  isNarrowViewport: boolean;
  hasTouch: boolean;
  /** In-app / WebView UA (Instagram, FB, WeChat, Android `wv`, …). */
  isInAppBrowserUa: boolean;
  saveData: boolean;
  /** Alias for Save-Data / slow-network defer policy. */
  prefersReducedData: boolean;
  effectiveType: string;
  deferHeavyNetwork: boolean;
  prefersReducedMotion: boolean;
  mobileRelaxedReload: boolean;
  /** `navigator.deviceMemory` when available (GB, rounded). */
  deviceMemoryGb: number | null;
};

const MOBILE_UA_RE =
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i;

/** Shared SoT for OAuth redirect + SW Contour C WebView honesty. */
const IN_APP_BROWSER_UA_RE =
  /(fban|fbav|instagram|line\/|micromessenger|wechat|tiktok|musical_ly|twitter|linkedinapp|wv\)|; wv)/i;

function readConnection():
  | { saveData?: boolean; effectiveType?: string }
  | undefined {
  if (typeof navigator === 'undefined') return undefined;
  return (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } })
    .connection;
}

/** True when UA looks like an in-app browser / embedded WebView. */
export function isInAppBrowserUa(userAgent?: string): boolean {
  const ua =
    userAgent ??
    (typeof navigator !== 'undefined' ? navigator.userAgent || '' : '');
  return IN_APP_BROWSER_UA_RE.test(ua);
}

export function getDeviceCapabilityProfile(): DeviceCapabilityProfile {
  if (typeof window === 'undefined') {
    return {
      isMobileUa: false,
      isNarrowViewport: false,
      hasTouch: false,
      isInAppBrowserUa: false,
      saveData: false,
      effectiveType: 'unknown',
      deferHeavyNetwork: false,
      prefersReducedMotion: false,
      mobileRelaxedReload: false,
      prefersReducedData: false,
      deviceMemoryGb: null,
    } satisfies DeviceCapabilityProfile;
  }

  const conn = readConnection();
  const saveData = Boolean(conn?.saveData);
  const nav = navigator as Navigator & { deviceMemory?: number };
  const deviceMemoryGb =
    typeof nav.deviceMemory === 'number' && Number.isFinite(nav.deviceMemory)
      ? nav.deviceMemory
      : null;
  const effectiveType = conn?.effectiveType ?? 'unknown';
  const deferHeavyNetwork =
    saveData || effectiveType === 'slow-2g' || effectiveType === '2g';

  const isMobileUa = MOBILE_UA_RE.test(navigator.userAgent);
  const isNarrowViewport =
    typeof matchMedia !== 'undefined' && matchMedia('(max-width: 639px)').matches;
  const hasTouch =
    typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches;
  const inApp = isInAppBrowserUa(navigator.userAgent);

  const prefersReducedMotion =
    typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  const mobileRelaxedReload = isMobileUa || (isNarrowViewport && hasTouch);

  return {
    isMobileUa,
    isNarrowViewport,
    hasTouch,
    isInAppBrowserUa: inApp,
    saveData,
    prefersReducedData: saveData || deferHeavyNetwork,
    effectiveType,
    deferHeavyNetwork,
    prefersReducedMotion,
    mobileRelaxedReload,
    deviceMemoryGb,
  };
}
