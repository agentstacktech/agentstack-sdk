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

export type DeliverNotificationResult = {
  success: boolean;
  correlation_key?: string;
  delivery?: {
    result?: Array<{ channel?: string; status?: string; error?: string }>;
  };
  receipt?: DeliveryReceiptRow;
  error?: string;
};

async function unwrap<T>(promise: Promise<APIResponse<T>>): Promise<T> {
  const response = await promise;
  return (response.data ?? response) as T;
}

function deliveryErrorMessage(err: unknown, fallback: string): string {
  const e = err as {
    message?: string;
    response?: { data?: { detail?: string | { message?: string } } };
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

export async function deliverNotification(
  http: HTTPClient,
  params: DeliverNotificationParams = {},
): Promise<DeliverNotificationResult> {
  try {
    const data = await unwrap<DeliverNotificationResult>(
      http.post('/users/me/notification-deliver', params),
    );
    if (data.success === false) {
      throw new Error(data.error || 'Delivery failed');
    }
    return data;
  } catch (err) {
    throw new Error(deliveryErrorMessage(err, 'Delivery failed'));
  }
}
