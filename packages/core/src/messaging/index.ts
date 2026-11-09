/**
 * Messaging admin SDK helpers.
 * Genetic tag: sdk.messaging.gen1
 */

export type {
  BotCandidateRow,
  DeliveryReceiptRow,
  CorrelationDeliveryStatus,
  NotificationDeliveryStatus,
  NotificationPrefsSnapshot,
  NotificationPrefsWrite,
  NotificationSourceHealth,
  NotificationSourcesHealthBatch,
  NotificationSourceRow,
  NotifyCategoryId,
  NotifyCategoryPref,
  NotifyDigestDepth,
  FlushNotifyDigestResult,
  PlatformTelegramHint,
  SourceKind,
  ChannelRouteRow,
  ChannelRoutesListResponse,
} from './notificationPrefs';

export {
  CHANNEL_ALIASES,
  NOTIFY_CATEGORIES,
  SOURCE_KINDS,
  deleteNotificationSource,
  flushNotifyDigest,
  getDeliveryStatus,
  getDeliveryStatusByCorrelationKey,
  getNotifyDigestDepth,
  getNotificationSourceHealth,
  listNotificationSourcesHealth,
  getNotificationPrefsSnapshot,
  listFailedDeliveries,
  putNotificationPrefs,
  patchNotificationPrefsCategory,
  getChannelRoutes,
  resolveNotificationRouting,
  putChannelRoute,
  removeChannelRoute,
  putNotificationSource,
} from './notificationPrefs';

export type { DeliverNotificationParams, DeliverNotificationResult } from './deliver';
export {
  deliverNotification,
  extractNotifyApiDetail,
  formatNotifyApiError,
} from './deliver';

import type { HTTPClient } from '../client/http-client';
import type { APIResponse } from '../types';

export type MessagingConfigResponse = {
  success: boolean;
  config?: Record<string, unknown>;
  provider_status?: Record<string, unknown>;
};

function deliveryErrorMessage(err: unknown, fallback: string): string {
  const e = err as {
    message?: string;
    response?: { data?: { detail?: string | { message?: string; reason?: string } } };
  };
  const detail = e.response?.data?.detail;
  if (typeof detail === 'object' && detail?.message) {
    return String(detail.message);
  }
  if (typeof detail === 'string' && detail.trim()) {
    return detail;
  }
  return e.message || fallback;
}

async function unwrap<T>(promise: Promise<APIResponse<T>>): Promise<T> {
  const response = await promise;
  return (response.data ?? response) as T;
}

export async function getMessagingConfig(
  http: HTTPClient,
): Promise<MessagingConfigResponse> {
  return unwrap(
    http.get<MessagingConfigResponse>('/api/admin/messaging/config', {}, { skipCache: true }),
  );
}

export async function putMessagingConfig(
  http: HTTPClient,
  body: Record<string, unknown>,
): Promise<MessagingConfigResponse> {
  return unwrap(http.put<MessagingConfigResponse>('/api/admin/messaging/config', body));
}

export async function testConnection(
  http: HTTPClient,
): Promise<{
  success: boolean;
  ok?: boolean;
  domain_count?: number;
  verified_count?: number;
  warnings?: string[];
  from_address?: string;
  provider?: string;
  error?: string;
}> {
  return unwrap(http.post('/api/admin/messaging/test-connection', {}));
}

export async function getAuthEmailReadiness(
  http: HTTPClient,
): Promise<{ success: boolean; readiness?: Record<string, unknown> }> {
  return unwrap(
    http.get('/api/admin/messaging/auth-email-readiness', {}, { skipCache: true }),
  );
}

export async function sendTestEmail(
  http: HTTPClient,
  email: string,
): Promise<{ success: boolean; to?: string; provider?: string }> {
  try {
    const data = await unwrap<{ success: boolean; to?: string; provider?: string; error?: string }>(
      http.post('/api/admin/messaging/send-test-email', { email }),
    );
    if (!data.success) {
      throw new Error(data.error || 'Failed to send test email');
    }
    return data;
  } catch (err) {
    throw new Error(deliveryErrorMessage(err, 'Failed to send test email'));
  }
}

export async function getDeliveryLogs(
  http: HTTPClient,
  limit = 50,
): Promise<{ success: boolean; items: unknown[] }> {
  const lim = Math.min(100, Math.max(1, Math.floor(limit || 50)));
  return unwrap(
    http.get(`/api/admin/messaging/deliveries?limit=${lim}`, {}, { skipCache: true }),
  );
}

export async function removeSuppression(
  http: HTTPClient,
  email: string,
): Promise<{ success: boolean }> {
  const addr = encodeURIComponent(String(email || '').trim());
  return unwrap(http.delete(`/api/admin/messaging/suppressions/${addr}`, { skipCache: true }));
}

export async function listSuppressions(
  http: HTTPClient,
  limit = 50,
): Promise<{ success: boolean; items: string[]; total?: number }> {
  const lim = Math.min(200, Math.max(1, Math.floor(limit || 50)));
  return unwrap(
    http.get(`/api/admin/messaging/suppressions?limit=${lim}`, {}, { skipCache: true }),
  );
}

export async function getMessagingOpsStatus(
  http: HTTPClient,
): Promise<Record<string, unknown>> {
  return unwrap(http.get('/api/admin/messaging/ops-status', {}, { skipCache: true }));
}

export async function getMessagingSetupInfo(
  http: HTTPClient,
): Promise<Record<string, unknown>> {
  return unwrap(http.get('/api/admin/messaging/setup-info', {}, { skipCache: true }));
}

export async function sendTestTelegram(
  http: HTTPClient,
): Promise<{ success: boolean }> {
  try {
    return await unwrap(http.post('/api/admin/messaging/send-test-telegram', {}));
  } catch (err) {
    throw new Error(deliveryErrorMessage(err, 'Telegram test ping failed'));
  }
}

export type SendAdminEmailParams = {
  email: string;
  subject?: string;
  message?: string;
  html_body?: string;
  template_name?: string;
  template_data?: Record<string, string>;
};

export async function sendAdminEmail(
  http: HTTPClient,
  params: SendAdminEmailParams,
): Promise<{ success: boolean; to?: string; provider?: string }> {
  try {
    const data = await unwrap<{ success: boolean; to?: string; provider?: string; error?: string }>(
      http.post('/api/admin/messaging/send-email', params),
    );
    if (!data.success) {
      throw new Error(data.error || 'Failed to send email');
    }
    return data;
  } catch (err) {
    throw new Error(deliveryErrorMessage(err, 'Failed to send email'));
  }
}

export type MailThreadMessage = {
  message_id?: string;
  direction?: string;
  from?: string;
  text?: string;
  rfc_id?: string;
  at?: string;
};

export type MailThreadCard = {
  id?: string;
  subject?: string;
  from?: string;
  snippet?: string;
  received_at?: string;
  read?: boolean;
  source?: string;
  connection_id?: string;
  messages?: MailThreadMessage[];
};

export type MailboxSettingsPatch = {
  forward_to_canonical?: boolean;
  notify_in_app?: boolean;
  notify_push?: boolean;
  notify_bots?: boolean;
};

const mailReadOpts = { skipCache: true as const };

export async function getMailInbox(
  http: HTTPClient,
  options?: { limit?: number },
): Promise<{ success: boolean; threads: MailThreadCard[] }> {
  const limit = options?.limit;
  const path =
    limit != null && limit > 0
      ? `/api/mail/inbox?limit=${Math.min(20, Math.max(1, Math.floor(limit)))}`
      : '/api/mail/inbox';
  return unwrap(http.get(path, {}, mailReadOpts));
}

export async function getMailThread(
  http: HTTPClient,
  threadId: string,
): Promise<{ success: boolean; thread: MailThreadCard }> {
  return unwrap(http.get(`/api/mail/inbox/${encodeURIComponent(threadId)}`, {}, mailReadOpts));
}

export async function getMailboxSettings(http: HTTPClient): Promise<{
  success: boolean;
  primary_address?: string;
  aliases?: string[];
  settings?: MailboxSettingsPatch & Record<string, unknown>;
}> {
  return unwrap(http.get('/api/mail/mailbox/settings', {}, mailReadOpts));
}

export async function claimMailbox(
  http: HTTPClient,
  local: string,
): Promise<{ success: boolean; primary_address?: string }> {
  try {
    return await unwrap(http.post('/api/mail/mailbox/claim', { local }));
  } catch (err) {
    throw new Error(deliveryErrorMessage(err, 'Could not claim that address'));
  }
}

export async function getProjectMailbox(
  http: HTTPClient,
  projectId: number,
): Promise<{ success: boolean; address?: string; recipient_user_ids?: number[] }> {
  return unwrap(
    http.get(`/api/projects/${projectId}/mail/mailbox`, {}, mailReadOpts),
  );
}

export async function claimProjectMailbox(
  http: HTTPClient,
  projectId: number,
  body: { local: string; recipient_user_ids?: number[]; allow_reserved?: boolean },
): Promise<{ success: boolean; address?: string; recipient_user_ids?: number[] }> {
  try {
    return await unwrap(http.post(`/api/projects/${projectId}/mail/mailbox`, body));
  } catch (err) {
    throw new Error(deliveryErrorMessage(err, 'Could not claim project address'));
  }
}

export async function putMailboxSettings(
  http: HTTPClient,
  settings: MailboxSettingsPatch,
): Promise<{ success: boolean; settings?: MailboxSettingsPatch & Record<string, unknown> }> {
  try {
    return await unwrap(http.put('/api/mail/mailbox/settings', settings));
  } catch (err) {
    throw new Error(deliveryErrorMessage(err, 'Could not save mailbox settings'));
  }
}

export async function replyMailbox(
  http: HTTPClient,
  text: string,
  idempotencyKey?: string,
  threadId?: string,
): Promise<{ success: boolean }> {
  try {
    const tid = String(threadId || '').trim();
    return await unwrap(
      http.post(
        '/api/mail/reply',
        { text, ...(tid ? { thread_id: tid } : {}) },
        idempotencyKey ? { headers: { 'Idempotency-Key': idempotencyKey } } : undefined,
      ),
    );
  } catch (err) {
    throw new Error(deliveryErrorMessage(err, 'Could not send reply'));
  }
}

export async function sendMailboxLetter(
  http: HTTPClient,
  body: { to: string; subject?: string; text: string },
  idempotencyKey?: string,
): Promise<{ success: boolean }> {
  try {
    return await unwrap(
      http.post(
        '/api/mail/send',
        body,
        idempotencyKey ? { headers: { 'Idempotency-Key': idempotencyKey } } : undefined,
      ),
    );
  } catch (err) {
    throw new Error(deliveryErrorMessage(err, 'Could not send mail'));
  }
}

export async function markMailRead(http: HTTPClient, threadId: string): Promise<{ success: boolean }> {
  try {
    return await unwrap(http.patch(`/api/mail/inbox/${encodeURIComponent(threadId)}`, { read: true }));
  } catch (err) {
    throw new Error(deliveryErrorMessage(err, 'Could not mark thread read'));
  }
}

export async function patchMailThread(
  http: HTTPClient,
  threadId: string,
  patch: { read: boolean },
): Promise<{ success: boolean }> {
  return unwrap(http.patch(`/api/mail/inbox/${encodeURIComponent(threadId)}`, patch));
}

export async function ensureAuthTemplates(
  http: HTTPClient,
  options?: { refresh?: boolean },
): Promise<{ success: boolean; merged?: number; added?: string[]; refreshed?: boolean }> {
  const refresh = Boolean(options?.refresh);
  return unwrap(http.post('/api/admin/messaging/ensure-auth-templates', { refresh }));
}
