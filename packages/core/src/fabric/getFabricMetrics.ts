/**
 * Fabric Prometheus metrics export (`sdk.fabric.gen1`, P9.4).
 */
import type { HTTPClient } from '../client/http-client';
import { unwrapApiData } from '../client/unwrapApiData';

export type FabricUserOpsJson = {
  marketplace_installs?: number;
  marketplace_installs_idempotent?: number;
  marketplace_publish_pending?: number;
  marketplace_moderation_approve?: number;
  marketplace_moderation_reject?: number;
  federation_webhook_enqueued?: number;
  notifications_by_type?: Record<string, number>;
  email_delivery_by_source?: Record<string, number>;
  email_failure_by_reason?: Record<string, number>;
  federation_webhooks_by_event?: Record<string, number>;
  notification_pipeline?: Record<string, number>;
  updated_at?: number;
};

export type FabricMetricsJson = {
  version: number;
  cost: Record<string, number>;
  workers: Record<string, number>;
  user_ops?: FabricUserOpsJson;
  routing_bandit?: {
    enabled: boolean;
    strategy?: string;
    prior_alpha?: number;
    prior_beta?: number;
    updates_total: number;
    arms: Array<Record<string, unknown>>;
    task_classes: Record<
      string,
      Record<string, { pulls: number; mean_reward: number; alpha?: number; beta?: number }>
    >;
  };
};

export async function getFabricMetricsJson(http: HTTPClient): Promise<FabricMetricsJson> {
  const res = await http.get<FabricMetricsJson>('/fabric/ops/metrics/json');
  const data = unwrapApiData(res);
  return {
    version: data.version ?? 1,
    cost: data.cost ?? {},
    workers: data.workers ?? {},
    user_ops: data.user_ops,
    routing_bandit: data.routing_bandit,
  };
}

export async function getFabricMetricsPrometheus(http: HTTPClient): Promise<string> {
  const res = await http.get<string>('/fabric/ops/metrics', {
    headers: { Accept: 'text/plain' },
  });
  const data = unwrapApiData(res);
  return typeof data === 'string' ? data : String(data);
}
