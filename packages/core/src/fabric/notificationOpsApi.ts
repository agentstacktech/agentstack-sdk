/**
 * Fabric notification ops status (`sdk.fabric.gen1`, B86).
 */
import type { HTTPClient } from '../client/http-client';
import { unwrapApiData } from '../client/unwrapApiData';

export type FabricNotificationOpsFlags = {
  digest_worker?: boolean;
  sse_pg_bus?: boolean;
  auto_digest_enqueue?: boolean;
  smoke_ops?: boolean;
};

export type FabricNotificationOpsStatus = {
  version: number;
  fabric_notifications_enabled?: boolean;
  flags?: FabricNotificationOpsFlags;
  public_origin?: string | null;
  digest_queue?: string;
  digest_queue_stats?: Record<string, number>;
  notification_pipeline?: Record<string, number>;
  pipeline_stage_labels?: Record<string, string>;
  notifications_by_type?: Record<string, number>;
  email_delivery_by_source?: Record<string, number>;
  updated_at?: number;
};

export type FabricNotificationSmokeRequest = {
  project_id: number;
  recipient_user_id?: number;
  title?: string;
  message?: string;
};

export type FabricNotificationSmokeResult = {
  success?: boolean;
  sent?: boolean;
  deduplicated?: boolean;
  notification_id?: string;
  project_id?: number;
  recipient_user_id?: number;
  smoke_run_id?: string;
  reason?: string;
};

export type FabricDigestEnqueueRequest = {
  project_id: number;
  window_hours?: number;
  recipient_user_id?: number;
};

export type FabricDigestEnqueueResult = {
  success?: boolean;
  enqueued?: number;
  skipped?: boolean;
  reason?: string;
  queue?: string;
  queued?: Array<{ recipient_user_id: number; queued_item_id: string }>;
};

export type FabricDigestPreviewResult = {
  success?: boolean;
  project_id?: number;
  window_hours?: number;
  recipient_count?: number;
  recipient_user_ids?: number[];
  fabric_in_app_unread_scanned?: number;
  error?: string;
};

export async function getFabricNotificationOpsStatus(
  http: HTTPClient,
): Promise<FabricNotificationOpsStatus> {
  const res = await http.get<FabricNotificationOpsStatus>('/fabric/ops/notifications/status');
  const data = unwrapApiData(res);
  return {
    version: data.version ?? 1,
    fabric_notifications_enabled: data.fabric_notifications_enabled,
    flags: data.flags,
    public_origin: data.public_origin,
    digest_queue: data.digest_queue,
    digest_queue_stats: data.digest_queue_stats ?? {},
    notification_pipeline: data.notification_pipeline ?? {},
    pipeline_stage_labels: data.pipeline_stage_labels ?? {},
    notifications_by_type: data.notifications_by_type ?? {},
    email_delivery_by_source: data.email_delivery_by_source ?? {},
    updated_at: data.updated_at,
  };
}

export async function triggerFabricNotificationSmoke(
  http: HTTPClient,
  body: FabricNotificationSmokeRequest,
): Promise<FabricNotificationSmokeResult> {
  const res = await http.post<FabricNotificationSmokeResult>(
    '/fabric/ops/notifications/smoke',
    body,
  );
  return unwrapApiData(res);
}

export async function enqueueFabricNotificationDigest(
  http: HTTPClient,
  body: FabricDigestEnqueueRequest,
): Promise<FabricDigestEnqueueResult> {
  const res = await http.post<FabricDigestEnqueueResult>(
    '/fabric/ops/notification-digest/enqueue',
    body,
  );
  return unwrapApiData(res);
}

export async function previewFabricNotificationDigest(
  http: HTTPClient,
  params: FabricDigestEnqueueRequest,
): Promise<FabricDigestPreviewResult> {
  const search = new URLSearchParams({
    project_id: String(params.project_id),
    window_hours: String(params.window_hours ?? 24),
  });
  if (params.recipient_user_id != null && params.recipient_user_id > 0) {
    search.set('recipient_user_id', String(params.recipient_user_id));
  }
  const res = await http.get<FabricDigestPreviewResult>(
    `/fabric/ops/notification-digest/preview?${search.toString()}`,
  );
  return unwrapApiData(res);
}
