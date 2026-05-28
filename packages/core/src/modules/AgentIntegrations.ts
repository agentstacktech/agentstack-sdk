/**
 * Integration Hub SDK — genetic: ``sdk.integrations.gen1``.
 *
 * REST surface: `/api/integrations/*` (this module). MCP parity (agents/MCP discovery):
 * `integrations.list_recipes`, `install_recipe`, `list_connections`, `test_hook`,
 * `export_connection`, `import_connection`, `rotate_secret`, `replay_delivery`,
 * `replay_delivery_url`, `connection_health`, `connector_schema`, `process_inbox_batch`,
 * `process_outbound_batch`, `list_inbox_events`, `generate_signing_secret`,
 * `export_connection_manifest`, `import_zapier_preview`, `import_make_preview`,
 * `list_issues`, `get_diagnostics`, `migrate_legacy_webhooks`, `poll_connection`.
 * See `docs/INTEGRATION_EVENT_CATALOG.md` and `agentstack-core/mcp/tools_integrations.py`.
 */

import { HTTPClient } from '../client/http-client';
import {
  IntegrationRecipeManifestSchema,
  InstallRecipeResultSchema,
  ListInboxEventsResponseSchema,
  type IntegrationRecipeManifest,
  type IntegrationOwnerKind,
  type InstallRecipeBody,
  type InstallRecipeResult,
  type ListInboxEventsResponse,
} from '../types/integrations';
import {
  integrationGetConnectorSetupSchema,
  integrationGetDiagnostics,
  integrationListConnections,
  integrationListDeliveries,
  integrationListInboxEvents,
  integrationListIssues,
  integrationListRecipes,
  type IntegrationListScope,
} from './integrationQueries';
export {
  buildHookPath,
  buildHookUrl,
  buildIntegrateHref,
  type IntegrateHrefSection,
} from './integrationHookUrls';

export type { IntegrationOwnerKind, InstallRecipeBody } from '../types/integrations';

export function buildIntegrationHookCurl(hookUrl: string, payload: unknown): string {
  const body = JSON.stringify(payload ?? { test: true });
  const escapedBody = body.replace(/'/g, "'\\''");
  return `curl -X POST '${hookUrl}' \\
  -H 'Content-Type: application/json' \\
  -d '${escapedBody}'`;
}

export class AgentIntegrations {
  constructor(private client: HTTPClient) {}

  listRecipes(params?: { provider?: string; category?: string; q?: string }) {
    return integrationListRecipes(this.client, params).then((res) => {
      const parsed = IntegrationRecipeManifestSchema.array().safeParse(res.data?.recipes ?? []);
      if (parsed.success) {
        return { ...res, data: { ...res.data, recipes: parsed.data } };
      }
      return res;
    });
  }

  getTaxonomies() {
    return this.client.get<{
      taxonomies: { provider: string[]; category: string[]; tags: string[] };
    }>('/integrations/recipes/taxonomies');
  }

  installRecipe(recipeId: string, body: InstallRecipeBody) {
    return this.client
      .post<InstallRecipeResult>(`/integrations/recipes/${recipeId}/install`, body)
      .then((res) => {
        const parsed = InstallRecipeResultSchema.safeParse(res.data);
        if (parsed.success) {
          return { ...res, data: parsed.data };
        }
        return res;
      });
  }

  listConnections(params: {
    owner_kind: IntegrationOwnerKind;
    project_id: number;
    user_id?: number;
    provider?: string;
  }) {
    return integrationListConnections(this.client, params);
  }

  createConnection(body: Record<string, unknown>) {
    return this.client.post<{ success: boolean; connection: unknown }>(
      '/integrations/connections',
      body,
    );
  }

  deleteConnection(connectionId: string) {
    return this.client.delete<{ success: boolean }>(`/integrations/connections/${connectionId}`);
  }

  listDeliveries(scope: IntegrationListScope) {
    return integrationListDeliveries(this.client, scope);
  }

  listIssues(scope: IntegrationListScope) {
    return integrationListIssues(this.client, scope);
  }

  listInboxEvents(scope: IntegrationListScope & { status?: string }) {
    return integrationListInboxEvents(this.client, scope).then((res) => {
      const parsed = ListInboxEventsResponseSchema.safeParse(res.data);
      if (parsed.success) {
        return { ...res, data: parsed.data };
      }
      return res;
    });
  }

  exportConnection(connectionId: string) {
    return this.client.get<{ version: number; connection: unknown }>(
      `/integrations/connections/${connectionId}/export`,
    );
  }

  importConnection(body: Record<string, unknown>) {
    return this.client.post<{ success: boolean; connection: unknown }>(
      '/integrations/connections/import',
      body,
    );
  }

  testHook(body: Record<string, unknown>) {
    return this.client.post<{
      success: boolean;
      duplicate?: boolean;
      matched?: number;
      error?: string;
    }>('/integrations/connections/test-hook', body);
  }

  revealSecrets(connectionId: string) {
    return this.client.get<{ connection_id: string; secrets: Record<string, unknown> }>(
      `/integrations/connections/${connectionId}/secrets`,
    );
  }

  getDiagnostics(projectId: number) {
    return integrationGetDiagnostics(this.client, projectId);
  }

  rotateSecret(connectionId: string, body: { key: string; value: string }) {
    return this.client.post<{ success: boolean; connection_id: string }>(
      `/integrations/connections/${connectionId}/rotate-secret`,
      body,
    );
  }

  generateSigningSecret(connectionId: string) {
    return this.client.post<{ success: boolean; connection_id: string; key?: string; generated?: boolean }>(
      `/integrations/connections/${connectionId}/rotate-secret/generate`,
      {},
    );
  }

  pollConnection(connectionId: string) {
    return this.client.post<Record<string, unknown>>(
      `/integrations/connections/${connectionId}/poll`,
      {},
    );
  }

  connectionHealth(connectionId: string) {
    return this.client.get<{
      connection_id: string;
      provider: string;
      health: Record<string, unknown>;
    }>(`/integrations/connections/${connectionId}/health`);
  }

  getConnectorSetupSchema(provider: string) {
    return integrationGetConnectorSetupSchema(this.client, provider);
  }

  async getRecipeSetupContext(recipe: IntegrationRecipeManifest) {
    const schemaRes = await this.getConnectorSetupSchema(recipe.provider);
    return {
      recipe,
      connectorSchema: schemaRes.data?.schema,
    };
  }

  replayDeliveryById(projectId: number, deliveryId: string) {
    return this.client.post<{ success?: boolean; result?: unknown }>(
      `/integrations/deliveries/${deliveryId}/replay`,
      {},
      { params: { project_id: projectId } },
    );
  }

  /** Replay outbound delivery to an explicit URL (ops / debugging). */
  replayDeliveryByUrl(projectId: number, params: { target_url: string; event_type?: string }) {
    return this.client.post<{ success?: boolean; result?: unknown }>(
      '/integrations/deliveries/replay',
      {},
      {
        params: {
          project_id: projectId,
          target_url: params.target_url,
          event_type: params.event_type ?? 'replay',
        },
      },
    );
  }

  /** Drain durable inbound integration inbox (same as REST / MCP ops tool). */
  processInboxBatch(limit = 32) {
    return this.client.post<{ processed: number; outcomes: unknown[] }>(
      '/integrations/inbox/process-batch',
      {},
      { params: { limit } },
    );
  }

  /** Drain outbound webhook delivery work queue. */
  processOutboundBatch(limit = 16) {
    return this.client.post<{ processed: number; outcomes: unknown[] }>(
      '/integrations/deliveries/process-batch',
      {},
      { params: { limit } },
    );
  }

  exportRecipeBundle() {
    return this.client.get<{ version: number; recipes: unknown[] }>(
      '/integrations/recipes/bundle',
    );
  }

  /** Dry-run preview for Zapier export JSON (`POST /integrations/import/zapier?dry_run=1`). */
  importZapierPreview(payload: Record<string, unknown>, dryRun = true) {
    return this.client.post<{ dry_run: boolean; preview: unknown }>(
      '/integrations/import/zapier',
      { payload },
      { params: { dry_run: dryRun } },
    );
  }

  /** Dry-run preview for Make scenario JSON (`POST /integrations/import/make?dry_run=1`). */
  importMakePreview(payload: Record<string, unknown>, dryRun = true) {
    return this.client.post<{ dry_run: boolean; preview: unknown }>(
      '/integrations/import/make',
      { payload },
      { params: { dry_run: dryRun } },
    );
  }

  commitZapierImport(body: Record<string, unknown>, dryRun = false) {
    return this.client.post<Record<string, unknown>>('/integrations/import/zapier', body, {
      params: { dry_run: dryRun },
    });
  }

  commitMakeImport(body: Record<string, unknown>, dryRun = false) {
    return this.client.post<Record<string, unknown>>('/integrations/import/make', body, {
      params: { dry_run: dryRun },
    });
  }

  migrateLegacyWebhooks(projectId: number) {
    return this.client.post<{ migrated: number; connection_ids: string[] }>(
      '/integrations/migrate-legacy-webhooks',
      {},
      { params: { project_id: projectId } },
    );
  }
}
