/**
 * Dispatch in-app text notifications without React.
 * Shells (e.g. agentstack-frontend) listen via `installClientTextNotificationBridge()`.
 */

export const CLIENT_TEXT_NOTIFICATION_EVENT = 'agentstack:client-text-notification' as const;

export interface ClientNotificationPayload {
  message: string;
  variant?: 'success' | 'error' | 'warning' | 'info';
  /** Toast duration in milliseconds (shell-specific). */
  duration?: number;
  meta?: Record<string, unknown>;
}

/**
 * Fires `agentstack:client-text-notification` on `window`.
 * Safe for service workers' clients.postMessage targets, WebSocket handlers, and plain TS modules.
 */
export function dispatchClientNotification(payload: ClientNotificationPayload): void {
  if (typeof window === 'undefined') return;
  const { message, variant, duration, meta } = payload;
  if (typeof message !== 'string' || !message.trim()) return;
  window.dispatchEvent(
    new CustomEvent(CLIENT_TEXT_NOTIFICATION_EVENT, {
      detail: { message, variant, duration, meta },
    })
  );
}
