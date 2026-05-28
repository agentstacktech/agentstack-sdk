/**
 * Registers / unregisters an Escape handler on the SDK shared overlay bridge.
 *
 * Gene: `sdk.react.shared_overlay_escape.gen1`
 */

import { useEffect, useRef } from 'react';
import {
  registerSharedOverlayEscapeConsumer,
  type KeydownCaptureHandler,
} from '@agentstack/sdk';

/**
 * @param enabled When false, nothing is registered.
 * @param handler Return true if Escape was consumed (same contract as {@link KeydownCaptureHandler}).
 *                Kept in a ref so callers can pass inline lambdas without re-subscribing every render.
 */
export function useSharedOverlayEscape(
  enabled: boolean,
  handler: KeydownCaptureHandler
): void {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (!enabled) return undefined;
    return registerSharedOverlayEscapeConsumer((event: KeyboardEvent) =>
      handlerRef.current(event)
    );
  }, [enabled]);
}
