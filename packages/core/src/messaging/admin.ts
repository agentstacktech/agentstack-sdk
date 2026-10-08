/**
 * Operator messaging admin SDK (`@agentstack/sdk/messaging/admin` alias).
 * Genetic tag: `sdk.messaging.gen1`
 *
 * Thin re-export barrel — implementations live in `./index` to avoid duplication (DRY).
 */
export type { MessagingConfigResponse, SendAdminEmailParams } from './index';

import type { HTTPClient } from '../client/http-client';
import type { APIResponse } from '../types';

export type ProjectNotifyPolicy = {
  allowed_bot_channels?: string[] | null;
  default_channels?: string[];
  mandatory_categories?: string[];
  admin_escalation_user_ids?: number[];
};

async function unwrapAdmin<T>(promise: Promise<APIResponse<T>>): Promise<T> {
  const response = await promise;
  return (response.data ?? response) as T;
}

export async function getProjectNotifyPolicy(
  http: HTTPClient,
  projectId: number,
): Promise<{ project_id: number; policy: ProjectNotifyPolicy }> {
  return unwrapAdmin(
    http.get(`/api/projects/${projectId}/notify-policy`, {}, { skipCache: true }),
  );
}

export async function putProjectNotifyPolicy(
  http: HTTPClient,
  projectId: number,
  patch: ProjectNotifyPolicy,
): Promise<{ project_id: number; policy: ProjectNotifyPolicy; env_uuid?: string }> {
  return unwrapAdmin(http.put(`/api/projects/${projectId}/notify-policy`, { patch }));
}

export {
  ensureAuthTemplates,
  getAuthEmailReadiness,
  getDeliveryLogs,
  getMessagingConfig,
  getMessagingOpsStatus,
  getMessagingSetupInfo,
  listSuppressions,
  putMessagingConfig,
  sendAdminEmail,
  sendTestEmail,
  sendTestTelegram,
  testConnection,
} from './index';
