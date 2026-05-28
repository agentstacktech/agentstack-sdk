/**
 * Lightbox viewport + "match screen orientation" heuristics.
 *
 * Browser-only helpers (guarded with `typeof window`). Safe to import from
 * Node tests if callers avoid calling `getLightboxViewportSize` without
 * mocking `window`.
 *
 * Gene: `sdk.media.gen1` · pairs with `createLightbox` + app-level PhotoSwipe.
 */

/** Treat near-square image / viewport as square (no 90° offer). */
export const LIGHTBOX_ORIENTATION_ASPECT_EPS = 1.02;

export function getLightboxViewportSize(): { w: number; h: number } {
  if (typeof window === 'undefined') return { w: 0, h: 0 };
  const vv = window.visualViewport;
  if (vv && vv.width > 0 && vv.height > 0) {
    return { w: vv.width, h: vv.height };
  }
  return { w: window.innerWidth, h: window.innerHeight };
}

/**
 * True when a single 90° rotation can swap the image's long axis with the
 * viewport's long axis (portrait viewport + landscape image, or the converse).
 */
export function shouldOfferOrientationMatch(
  naturalW: number,
  naturalH: number,
  viewportW: number,
  viewportH: number
): boolean {
  if (naturalW <= 0 || naturalH <= 0 || viewportW <= 0 || viewportH <= 0) {
    return false;
  }
  const e = LIGHTBOX_ORIENTATION_ASPECT_EPS;
  const imagePortrait = naturalH >= naturalW * e;
  const imageLandscape = naturalW >= naturalH * e;
  const screenPortrait = viewportH >= viewportW * e;
  const screenLandscape = viewportW >= viewportH * e;
  return (screenPortrait && imageLandscape) || (screenLandscape && imagePortrait);
}
