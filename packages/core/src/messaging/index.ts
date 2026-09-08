/**
 * Messaging admin SDK helpers.
 * Genetic tag: sdk.messaging.gen1
 */

import type { HTTPClient } from '../client/http-client';
import type { APIResponse } from '../types';

export type MessagingConfigResponse = {
  success: boolean;
  config?: Record<string, unknown>;
  provider_status?: Record<string, unknown>;
};

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

export async function sendTestEmail(
  http: HTTPClient,
  email: string,
): Promise<{ success: boolean; to?: string; provider?: string }> {
  return unwrap(http.post('/api/admin/messaging/send-test-email', { email }));
}

export async function getDeliveryLogs(
  http: HTTPClient,
  limit = 50,
): Promise<{ success: boolean; items: unknown[] }> {
  return unwrap(
    http.get(`/api/admin/messaging/deliveries?limit=${limit}`, {}, { skipCache: true }),
  );
}

export async function getMessagingOpsStatus(
  http: HTTPClient,
): Promise<Record<string, unknown>> {
  return unwrap(http.get('/api/admin/messaging/ops-status', {}, { skipCache: true }));
}
