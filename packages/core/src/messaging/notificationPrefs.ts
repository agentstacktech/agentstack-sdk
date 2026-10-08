/**
 * User notification prefs snapshot types (`sdk.messaging.gen1`).
 * Mirrors GET `/users/me/notification-prefs`.
 */

import type { HTTPClient } from '../client/http-client';
import type { APIResponse } from '../types';

export const NOTIFY_CATEGORIES = [
  'security',
  'auth',
  'billing',
  'social',
  'fabric',
  'marketing',
] as const;

export type NotifyCategoryId = (typeof NOTIFY_CATEGORIES)[number];

export const SOURCE_KINDS = ['email', 'web_push', 'in_app', 'bot'] as const;

export type SourceKind = (typeof SOURCE_KINDS)[number];

/** Matrix column aliases ↔ enrolled source kinds (DRY with backend). */
export const CHANNEL_ALIASES: Record<string, string> = {
  web_push: 'push',
  push: 'web_push',
};

export type NotifyCategoryPref = {
  channels: string[];
  muted?: boolean;
};

export type NotificationSourceRow = {
  id: string;
  kind: string;
  enabled: boolean;
  label?: string;
  channel?: string | null;
  bot_uuid?: string | null;
  connection_uuid?: string | null;
  project_id?: number | null;
  identity_id?: string | null;
  role?: string | null;
};

export type BotCandidateRow = {
  role: 'platform' | 'custom';
  channel: string;
  bot_uuid: string;
  connection_uuid?: string;
  project_id?: number;
  label?: string;
  username?: string;
  deeplink?: string;
};

export type PlatformTelegramHint = {
  enabled?: boolean;
  bot_uuid?: string;
  connection_uuid?: string;
  project_id?: number;
  username?: string;
  deeplink?: string;
};

export type DeliveryReceiptRow = {
  correlation_key?: string;
  channel?: string;
  status?: 'delivered' | 'failed' | 'deferred' | 'skipped';
  at?: string;
  source_id?: string | null;
  error_code?: string | null;
};

export type NotificationDeliveryStatus = {
  receipts?: DeliveryReceiptRow[];
  failed_deliveries?: DeliveryReceiptRow[];
  can_deliver?: Record<string, boolean>;
};

export type NotifyDigestDepth = {
  total: number;
  by_category: Record<string, number>;
};

export type NotificationPrefsSnapshot = {
  prefs?: { categories?: Record<string, NotifyCategoryPref> };
  sources?: NotificationSourceRow[];
  enabled_kinds?: string[];
  bot_channels?: string[];
  platform_telegram?: PlatformTelegramHint;
  bot_candidates?: BotCandidateRow[];
  delivery_receipts?: DeliveryReceiptRow[];
};

async function unwrap<T>(promise: Promise<APIResponse<T>>): Promise<T> {
  const response = await promise;
  return (response.data ?? response) as T;
}

export type CorrelationDeliveryStatus = {
  correlation_key: string;
  receipts?: DeliveryReceiptRow[];
  latest_status?: string | null;
  status?: string | null;
};

export async function getDeliveryStatusByCorrelationKey(
  http: HTTPClient,
  correlationKey: string,
): Promise<CorrelationDeliveryStatus> {
  const ck = encodeURIComponent(correlationKey.trim());
  const raw = await unwrap(
    http.get<{ success?: boolean } & CorrelationDeliveryStatus>(
      `/users/me/delivery-status?correlation_key=${ck}`,
      {},
      { skipCache: true },
    ),
  );
  const { success: _s, ...status } = raw;
  return status;
}

export type FlushNotifyDigestResult = {
  success?: boolean;
  flushed?: number;
  attempted?: number;
  failures?: Array<{ id?: string; error?: string }>;
};

export async function flushNotifyDigest(
  http: HTTPClient,
  options?: { projectId?: number; limit?: number },
): Promise<FlushNotifyDigestResult> {
  const pid = options?.projectId;
  const limit = options?.limit ?? 20;
  const qs = new URLSearchParams();
  if (pid != null && pid > 0) qs.set('project_id', String(pid));
  if (limit > 0) qs.set('limit', String(Math.min(50, limit)));
  const suffix = qs.toString() ? `?${qs.toString()}` : '';
  const raw = await unwrap(
    http.post<{ success?: boolean } & FlushNotifyDigestResult>(
      `/users/me/notify-flush-digest${suffix}`,
      {},
      { skipCache: true },
    ),
  );
  const { success: _s, ...rest } = raw;
  return rest;
}

export async function getNotifyDigestDepth(
  http: HTTPClient,
  options?: { projectId?: number },
): Promise<NotifyDigestDepth> {
  const pid = options?.projectId;
  const qs = pid != null && pid > 0 ? `?project_id=${encodeURIComponent(String(pid))}` : '';
  const raw = await unwrap(
    http.get<{ success?: boolean; total?: number; by_category?: Record<string, number> }>(
      `/users/me/notify-digest-depth${qs}`,
      {},
      { skipCache: true },
    ),
  );
  return {
    total: Number(raw.total ?? 0),
    by_category: raw.by_category ?? {},
  };
}

export async function getDeliveryStatus(
  http: HTTPClient,
): Promise<NotificationDeliveryStatus> {
  const raw = await unwrap(
    http.get<{ success?: boolean } & NotificationDeliveryStatus>(
      '/users/me/notification-delivery-status',
      {},
      { skipCache: true },
    ),
  );
  const { success: _s, ...status } = raw;
  return status;
}

export async function listFailedDeliveries(
  http: HTTPClient,
  limit = 20,
): Promise<{ failed_deliveries: DeliveryReceiptRow[] }> {
  const raw = await unwrap(
    http.get<{ success?: boolean; failed_deliveries?: DeliveryReceiptRow[] }>(
      `/users/me/notification-failed-deliveries?limit=${Math.max(1, Math.min(100, limit))}`,
      {},
      { skipCache: true },
    ),
  );
  return { failed_deliveries: raw.failed_deliveries ?? [] };
}

export async function getNotificationPrefsSnapshot(
  http: HTTPClient,
): Promise<NotificationPrefsSnapshot> {
  return unwrap(
    http.get<NotificationPrefsSnapshot>('/users/me/notification-prefs', {}, { skipCache: true }),
  );
}

export type NotificationPrefsWrite = {
  categories: Record<string, NotifyCategoryPref>;
  quiet_hours?: { start?: string; end?: string; tz?: string };
  digest_mode?: string;
};

export async function putNotificationPrefs(
  http: HTTPClient,
  prefs: NotificationPrefsWrite,
): Promise<{ prefs: NotificationPrefsWrite }> {
  return unwrap(http.put('/users/me/notification-prefs', prefs));
}

export async function putNotificationSource(
  http: HTTPClient,
  source: Partial<NotificationSourceRow> & { kind: string },
): Promise<{ sources: NotificationSourceRow[] }> {
  return unwrap(http.put('/users/me/notification-sources', { source }));
}

export async function deleteNotificationSource(
  http: HTTPClient,
  sourceId: string,
): Promise<{ sources: NotificationSourceRow[] }> {
  const id = String(sourceId || '').trim();
  return unwrap(http.delete(`/users/me/notification-sources/${encodeURIComponent(id)}`));
}

export type NotificationSourceHealth = {
  ok: boolean;
  source_id?: string;
  kind?: string;
  channel?: string | null;
  enabled?: boolean;
  reachable?: boolean;
  issues?: string[];
  error?: string;
};

export async function getNotificationSourceHealth(
  http: HTTPClient,
  sourceId: string,
): Promise<NotificationSourceHealth> {
  const id = String(sourceId || '').trim();
  const raw = await unwrap(
    http.get<{ success?: boolean } & NotificationSourceHealth>(
      `/users/me/notification-sources/${encodeURIComponent(id)}/health`,
      {},
      { skipCache: true },
    ),
  );
  const { success: _s, ...health } = raw;
  return health;
}
