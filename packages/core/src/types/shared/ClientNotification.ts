/**
 * Portable payloads for in-app client notifications.
 * Web shells map these to toast / banner UI; no DOM or React dependency here.
 */

export type ClientNotificationMessengerScope = {
  homeProjectId: number;
  channelId: string;
};

/** Mirrors frontend ``ToastNotificationMeta`` for cross-package contracts. */
export type ClientNotificationMeta = {
  tags?: string[];
  messenger?: ClientNotificationMessengerScope;
  peerUserId?: number;
  source?: string;
};

export type ClientTextNotificationPayload = {
  message: string;
  variant?: 'success' | 'error' | 'warning' | 'info';
  durationMs?: number;
  meta?: ClientNotificationMeta;
};
