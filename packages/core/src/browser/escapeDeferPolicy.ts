/**
 * Composable policies for Escape handlers on a shared capture bridge.
 *
 * Typical pattern: defer closing a dialog while fullscreen media (PhotoSwipe,
 * custom immersive chrome) is visible — return `false` so LIFO continues to
 * older registrations that own the media layer.
 *
 * Gene: `sdk.browser.escape_defer.gen1`
 */

import type { KeydownCaptureHandler } from './overlayCaptureBridges';

/**
 * When `shouldDefer()` is true, the handler returns `false` (not consumed).
 * Otherwise delegates to `inner`.
 */
export function deferEscapeWhen(
  shouldDefer: () => boolean,
  inner: KeydownCaptureHandler
): KeydownCaptureHandler {
  return (event: KeyboardEvent) => {
    if (shouldDefer()) return false;
    return inner(event);
  };
}
