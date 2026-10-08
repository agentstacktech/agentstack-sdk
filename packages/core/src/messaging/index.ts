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
  NotificationSourceRow,
  NotifyCategoryId,
  NotifyCategoryPref,
  NotifyDigestDepth,
  FlushNotifyDigestResult,
  PlatformTelegramHint,
  SourceKind,
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
  getNotificationPrefsSnapshot,
  listFailedDeliveries,
  putNotificationPrefs,
  putNotificationSource,
} from './notificationPrefs';

export type { DeliverNotificationParams, DeliverNotificationResult } from './deliver';
export { deliverNotification } from './deliver';

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
): Promise<{ success: boolean; ok?: boolean; domain_count?: number; verified_count?: number }> {
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
  return unwrap(
    http.get(`/api/admin/messaging/deliveries?limit=${limit}`, {}, { skipCache: true }),
  );
}

export async function listSuppressions(
  http: HTTPClient,
  limit = 50,
): Promise<{ success: boolean; items: string[]; total?: number }> {
  return unwrap(
    http.get(`/api/admin/messaging/suppressions?limit=${limit}`, {}, { skipCache: true }),
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

export type MailThreadCard = {
  id?: string;
  subject?: string;
  from?: string;
  snippet?: string;
  received_at?: string;
  read?: boolean;
  messages?: Array<{ text?: string; from?: string }>;
};

export async function getMailInbox(http: HTTPClient): Promise<{ success: boolean; threads: MailThreadCard[] }> {
  return unwrap(http.get('/api/mail/inbox'));
}

export async function getMailThread(
  http: HTTPClient,
  threadId: string,
): Promise<{ success: boolean; thread: MailThreadCard }> {
  return unwrap(http.get(`/api/mail/inbox/${encodeURIComponent(threadId)}`));
}

export async function getMailboxSettings(http: HTTPClient): Promise<{
  success: boolean;
  primary_address?: string;
  aliases?: string[];
  settings?: { forward_to_canonical?: boolean; notify_in_app?: boolean; notify_push?: boolean };
}> {
  return unwrap(http.get('/api/mail/mailbox/settings'));
}

export async function claimMailbox(
  http: HTTPClient,
  local: string,
): Promise<{ success: boolean; primary_address?: string }> {
  return unwrap(http.post('/api/mail/mailbox/claim', { local }));
}

export async function putMailboxSettings(
  http: HTTPClient,
  settings: { forward_to_canonical?: boolean; notify_in_app?: boolean; notify_push?: boolean },
): Promise<{ success: boolean }> {
  return unwrap(http.put('/api/mail/mailbox/settings', settings));
}

export async function replyMailbox(
  http: HTTPClient,
  text: string,
  idempotencyKey?: string,
): Promise<{ success: boolean }> {
  return unwrap(
    http.post('/api/mail/reply', { text }, idempotencyKey ? { headers: { 'Idempotency-Key': idempotencyKey } } : undefined),
  );
}

export async function sendMailboxLetter(
  http: HTTPClient,
  body: { to: string; subject?: string; text: string },
  idempotencyKey?: string,
): Promise<{ success: boolean }> {
  return unwrap(
    http.post('/api/mail/send', body, idempotencyKey ? { headers: { 'Idempotency-Key': idempotencyKey } } : undefined),
  );
}

export async function markMailRead(http: HTTPClient, threadId: string): Promise<{ success: boolean }> {
  return unwrap(http.patch(`/api/mail/inbox/${encodeURIComponent(threadId)}`, { read: true }));
}

export async function ensureAuthTemplates(
  http: HTTPClient,
  options?: { refresh?: boolean },
): Promise<{ success: boolean; merged?: number; added?: string[]; refreshed?: boolean }> {
  const refresh = Boolean(options?.refresh);
  return unwrap(http.post('/api/admin/messaging/ensure-auth-templates', { refresh }));
}
