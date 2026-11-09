/**
 * User-scoped test delivery (`sdk.messaging.gen1` · `core.messaging.channel_plane.gen1`).
 */
import type { HTTPClient } from '../client/http-client';
import type { APIResponse } from '../types';

import type { DeliveryReceiptRow } from './notificationPrefs';

export type DeliverNotificationParams = {
  channel?: string;
  category?: string;
  source_id?: string;
  correlation_key?: string;
  project_id?: number;
};

export type NotificationDeliverBody = {
  status?: string;
  reason?: string;
  category?: string;
  error_code?: string;
  result?: Array<{ channel?: string; status?: string; error?: string }>;
};

export type DeliverNotificationResult = {
  success: boolean;
  deferred?: boolean;
  correlation_key?: string;
  delivery?: NotificationDeliverBody;
  receipt?: DeliveryReceiptRow;
  error?: string;
};

async function unwrap<T>(promise: Promise<APIResponse<T>>): Promise<T> {
  const response = await promise;
  return (response.data ?? response) as T;
}

/** FastAPI `detail` string when present (e.g. `route_cap`, `channel_not_linked`). */
export function extractNotifyApiDetail(err: unknown): string | undefined {
  const e = err as {
    message?: string;
    response?: { data?: { detail?: string | { message?: string; reason?: string } } };
  };
  const detail = e.response?.data?.detail;
  if (typeof detail === 'string' && detail.trim()) {
    return detail.trim();
  }
  if (typeof detail === 'object' && detail && !Array.isArray(detail)) {
    const row = detail as { message?: string; reason?: string };
    if (typeof row.reason === 'string' && row.reason.trim()) {
      return row.reason.trim();
    }
    if (typeof row.message === 'string' && row.message.trim()) {
      return row.message.trim();
    }
  }
  const msg = e.message?.trim();
  if (msg && /^[a-z][a-z0-9_]+$/.test(msg)) {
    return msg;
  }
  return undefined;
}

export function formatNotifyApiError(err: unknown, fallback = 'Request failed'): string {
  return deliveryErrorMessage(err, fallback);
}

function deliveryErrorMessage(err: unknown, fallback: string): string {
  const e = err as {
    message?: string;
    response?: { data?: { detail?: string | { message?: string } } };
  };
  const detail = e.response?.data?.detail;
  if (Array.isArray(detail)) {
    const msg = (detail[0] as { msg?: unknown } | undefined)?.msg;
    if (typeof msg === 'string' && msg.trim()) {
      return msg;
    }
  }
  if (typeof detail === 'object' && detail && !Array.isArray(detail)) {
    const row = detail as { message?: string; reason?: string };
    if (row.message) {
      return String(row.message);
    }
    if (row.reason) {
      return String(row.reason);
    }
  }
  if (typeof detail === 'string' && detail.trim()) {
    return detail;
  }
  return e.message || fallback;
}

export async function deliverNotification(
  http: HTTPClient,
  params: DeliverNotificationParams = {},
): Promise<DeliverNotificationResult> {
  try {
    const data = await unwrap<DeliverNotificationResult>(
      http.post('/users/me/notification-deliver', params),
    );
    if (data.deferred || data.delivery?.status === 'deferred') {
      return { ...data, success: true, deferred: true };
    }
    if (data.success === false) {
      const detail =
        data.delivery?.error_code ||
        data.delivery?.reason ||
        data.error ||
        'Delivery failed';
      throw new Error(String(detail));
    }
    return data;
  } catch (err) {
    throw new Error(deliveryErrorMessage(err, 'Delivery failed'));
  }
}
