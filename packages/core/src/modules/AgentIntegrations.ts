/**
 * Integration Hub SDK — genetic: ``sdk.integrations.gen1``.
 *
 * REST surface: `/api/integrations/*` (this module). MCP parity (agents/MCP discovery):
 * Hub plumbing: `integrations.list_recipes`, `install_recipe`, `list_connections`, `test_hook`,
 * `export_connection`, `import_connection`, `rotate_secret`, `replay_delivery`,
 * `replay_delivery_url`, `connection_health`, `connector_schema` (SDK: `getConnectorSetupSchema`),
 * `process_inbox_batch`, `process_outbound_batch`, `list_inbox_events`, `generate_signing_secret`,
 * `export_connection_manifest`, `import_zapier_preview`, `import_make_preview`,
 * `list_issues`, `get_diagnostics`, `migrate_legacy_webhooks`, `poll_connection`,
 * `oauth_begin`, `refresh_token`, `activate_webhook` (SDK: `activateConnectionWebhook`),
 * `update_connection`, `list_apps`, `get_app`, `dynamic_fields`,
 * `hydrate_triggers`, `rebind_triggers`.
 * iPaaS authoring (0.4.15): scenarios CRUD/publish/test-step/runs via REST+SDK
 * (`listScenarios`, `saveScenarioDraft`, `publishScenario`, `unpublishScenario`, …);
 * MCP: `integrations.create_scenario`, `save_scenario_draft`, `publish_scenario`,
 * `unpublish_scenario`, `test_scenario_step`, `list_scenario_runs`.
 * Ops-only OK: `integrations.get_hubspot_relay_stats` (no SDK wrapper).
 * See `docs/INTEGRATION_EVENT_CATALOG.md` and `agentstack-core/mcp/tools_integrations.py`.
 */

import { HTTPClient } from '../client/http-client';
import {
  DynamicFieldsResponseSchema,
  GetAppResponseSchema,
  ListAppsResponseSchema,
  type AppDefinition,
  type DynamicFieldsResponse,
  type ListAppsResponse,
} from '../types/integrationApps';
import {
  IntegrationRecipeManifestSchema,
  InstallRecipeResultSchema,
  ListInboxEventsResponseSchema,
  ListScenariosResponseSchema,
  ListScenarioRunsResponseSchema,
  type IntegrationRecipeManifest,
  type IntegrationOwnerKind,
  type InstallRecipeBody,
  type InstallRecipeResult,
  type ListInboxEventsResponse,
} from '../types/integrations';
import {
  integrationGetConnectorSetupSchema,
  integrationGetDiagnostics,
  integrationGetPlatformDiagnostics,
  integrationHydrateTriggers,
  integrationRebindTriggers,
  integrationListConnections,
  integrationListDeliveries,
  integrationListInboxEvents,
  integrationListIssues,
  integrationListRecipes,
  integrationListScenarios,
  integrationListScenarioRuns,
  type IntegrationListScope,
} from './integrationQueries';
export {
  buildHookPath,
  buildHookUrl,
  buildIntegrateHref,
  buildAgentAutomateHref,
  buildIntegrateEventsHref,
  type IntegrateHrefSection,
} from './integrationHookUrls';

export type { IntegrationOwnerKind, InstallRecipeBody } from '../types/integrations';
export type { AppDefinition, DynamicFieldsResponse, ListAppsResponse } from '../types/integrationApps';

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

  listApps(params?: { q?: string; category?: string; tag?: string }) {
    return this.client
      .get<ListAppsResponse>('/integrations/apps', { params })
      .then((res) => {
        const parsed = ListAppsResponseSchema.safeParse(res.data);
        if (parsed.success) {
          return { ...res, data: parsed.data };
        }
        return res;
      });
  }

  getAppTaxonomies() {
    return this.client.get<{
      taxonomies: { provider: string[]; category: string[]; tags: string[] };
    }>('/integrations/apps/taxonomies');
  }

  getApp(provider: string) {
    return this.client.get<{ app: AppDefinition }>(`/integrations/apps/${provider}`).then((res) => {
      const parsed = GetAppResponseSchema.safeParse(res.data);
      if (parsed.success) {
        return { ...res, data: parsed.data };
      }
      return res;
    });
  }

  listAppTriggers(provider: string) {
    return this.client.get<{ provider: string; triggers: unknown[]; total: number }>(
      `/integrations/apps/${provider}/triggers`,
    );
  }

  listAppActions(provider: string) {
    return this.client.get<{ provider: string; actions: unknown[]; total: number }>(
      `/integrations/apps/${provider}/actions`,
    );
  }

  dynamicFields(provider: string, fieldId?: string) {
    return this.client
      .get<DynamicFieldsResponse>(`/integrations/apps/${provider}/dynamic-fields`, {
        params: fieldId ? { field_id: fieldId } : undefined,
      })
      .then((res) => {
        const parsed = DynamicFieldsResponseSchema.safeParse(res.data);
        if (parsed.success) {
          return { ...res, data: parsed.data };
        }
        return res;
      });
  }

  installRecipe(
    recipeId: string,
    body: InstallRecipeBody,
    options?: { idempotencyKey?: string },
  ) {
    const { idempotency_key: bodyKey, ...rest } = body;
    const idempotencyKey =
      options?.idempotencyKey ?? bodyKey ?? `install-${recipeId}-${Date.now()}`;
    return this.client
      .post<InstallRecipeResult>(
        `/integrations/recipes/${recipeId}/install`,
        { ...rest, idempotency_key: idempotencyKey },
        { idempotencyKey },
      )
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

  createConnection(
    body: Record<string, unknown>,
    options?: { idempotencyKey?: string },
  ) {
    const fromBody =
      typeof body.idempotency_key === 'string' ? body.idempotency_key : undefined;
    const idempotencyKey =
      options?.idempotencyKey ?? fromBody ?? `conn-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    return this.client.post<{ success: boolean; connection: unknown }>(
      '/integrations/connections',
      { ...body, idempotency_key: idempotencyKey },
      { idempotencyKey },
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

  getPlatformDiagnostics() {
    return integrationGetPlatformDiagnostics(this.client);
  }

  rotateSecret(connectionId: string, body: { key: string; value: string }) {
    return this.client.post<{ success: boolean; connection_id: string }>(
      `/integrations/connections/${connectionId}/rotate-secret`,
      body,
    );
  }

  generateSigningSecret(connectionId: string) {
    return this.client.post<{
      success: boolean;
      connection_id: string;
      key?: string;
      generated?: boolean;
      secret?: string | null;
    }>(`/integrations/connections/${connectionId}/rotate-secret/generate`, {});
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
      logic_id?: string | null;
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

  replayDeliveryById(
    projectId: number,
    deliveryId: string,
    scope?: { owner_kind?: IntegrationOwnerKind; user_id?: number },
  ) {
    return this.client.post<{ success?: boolean; result?: unknown }>(
      `/integrations/deliveries/${deliveryId}/replay`,
      {},
      {
        params: {
          project_id: projectId,
          owner_kind: scope?.owner_kind ?? 'project',
          ...(scope?.user_id != null ? { user_id: scope.user_id } : {}),
        },
      },
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

  /** Poll due connections with ``config.poll_enabled`` (ops worker). */
  processPollingBatch(
    limit = 16,
    scope?: { project_id?: number; min_interval_s?: number },
  ) {
    return this.client.post<{
      processed: number;
      skipped_not_due: number;
      outcomes: unknown[];
    }>('/integrations/polling/process-batch', {}, {
      params: {
        limit,
        ...(scope?.project_id != null ? { project_id: scope.project_id } : {}),
        ...(scope?.min_interval_s != null ? { min_interval_s: scope.min_interval_s } : {}),
      },
    });
  }

  hydrateTriggers(limit = 256) {
    return integrationHydrateTriggers(this.client, limit);
  }

  rebindTriggers(opts?: { project_id?: number; limit?: number }) {
    return integrationRebindTriggers(this.client, opts);
  }

  /** Replay an inbound inbox event through intake (test-hook replay path). */
  replayInboxById(
    projectId: number,
    inboxId: string,
    scope?: { owner_kind?: IntegrationOwnerKind; user_id?: number },
  ) {
    return this.client.post<{ success: boolean; duplicate?: boolean; matched?: number }>(
      `/integrations/inbox/${inboxId}/replay`,
      {},
      {
        params: {
          project_id: projectId,
          owner_kind: scope?.owner_kind ?? 'project',
          ...(scope?.user_id != null ? { user_id: scope.user_id } : {}),
        },
      },
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

  commitN8nImport(body: Record<string, unknown>, dryRun = false) {
    return this.client.post<Record<string, unknown>>('/integrations/import/n8n', body, {
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

  listDlqDeliveries(scope: IntegrationListScope) {
    return this.client.get<{ deliveries: unknown[]; total: number }>(
      '/integrations/deliveries/dlq',
      {
        params: {
          project_id: scope.project_id,
          owner_kind: scope.owner_kind ?? 'project',
          ...(scope.user_id != null ? { user_id: scope.user_id } : {}),
          ...(scope.connection_id ? { connection_id: scope.connection_id } : {}),
          ...(scope.limit != null ? { limit: scope.limit } : {}),
        },
      },
    );
  }

  generateScenario(body: {
    prompt: string;
    project_id: number;
    provider?: string;
    connection_id?: string;
  }) {
    return this.client.post<Record<string, unknown>>('/integrations/scenarios/generate', body);
  }

  listModules() {
    return this.client.get<{ modules: unknown[]; total: number }>('/integrations/modules');
  }

  listModuleRegistrations(
    scope: IntegrationListScope & { connection_id?: string; limit?: number },
  ) {
    return this.client.get<{ registrations: unknown[]; total: number }>(
      '/integrations/modules/registrations',
      {
        params: {
          project_id: scope.project_id,
          owner_kind: scope.owner_kind ?? 'project',
          ...(scope.user_id != null ? { user_id: scope.user_id } : {}),
          ...(scope.connection_id ? { connection_id: scope.connection_id } : {}),
          ...(scope.limit != null ? { limit: scope.limit } : {}),
        },
      },
    );
  }

  registerModule(
    moduleId: string,
    body: { parent_connection_id: string; label: string },
  ) {
    return this.client.post<Record<string, unknown>>(
      `/integrations/modules/${encodeURIComponent(moduleId)}/register`,
      body,
    );
  }

  importN8nPreview(payload: Record<string, unknown>, dryRun = true) {
    return this.client.post<{ dry_run: boolean; preview: unknown }>(
      '/integrations/import/n8n',
      { payload },
      { params: { dry_run: dryRun } },
    );
  }

  listScenarios(scope: IntegrationListScope & { limit?: number }) {
    return integrationListScenarios(this.client, scope).then((res) => {
      const parsed = ListScenariosResponseSchema.safeParse(res.data);
      if (parsed.success) {
        return { ...res, data: parsed.data };
      }
      return res;
    });
  }

  createScenario(body: {
    owner_kind?: IntegrationOwnerKind;
    project_id: number;
    user_id: number;
    name: string;
    recipe_id?: string;
    connection_ids?: string[];
    metadata?: Record<string, unknown>;
  }) {
    return this.client.post<Record<string, unknown>>('/integrations/scenarios', body);
  }

  saveScenarioDraft(
    scenarioId: string,
    body: {
      project_id: number;
      spec?: Record<string, unknown>;
      logic?: Record<string, unknown>;
      summary?: string;
    },
  ) {
    return this.client.post<Record<string, unknown>>(
      `/integrations/scenarios/${scenarioId}/draft`,
      body,
    );
  }

  publishScenario(
    scenarioId: string,
    projectId: number,
    options?: { idempotencyKey?: string },
  ) {
    const idempotencyKey =
      options?.idempotencyKey ?? `publish-${scenarioId}-${Date.now()}`;
    return this.client.post<Record<string, unknown>>(
      `/integrations/scenarios/${scenarioId}/publish`,
      {},
      { params: { project_id: projectId }, idempotencyKey },
    );
  }

  unpublishScenario(scenarioId: string, projectId: number) {
    return this.client.post<Record<string, unknown>>(
      `/integrations/scenarios/${scenarioId}/unpublish`,
      {},
      { params: { project_id: projectId } },
    );
  }

  exportScenario(scenarioId: string, projectId: number) {
    return this.client.get<Record<string, unknown>>(
      `/integrations/scenarios/${scenarioId}/export`,
      { params: { project_id: projectId } },
    );
  }

  testScenarioStep(
    scenarioId: string,
    body: {
      project_id: number;
      step_id?: string;
      command_data?: Record<string, unknown>;
      mocks?: Record<string, unknown>;
      pin_data?: Record<string, unknown>;
    },
  ) {
    return this.client.post<Record<string, unknown>>(
      `/integrations/scenarios/${scenarioId}/test-step`,
      body,
    );
  }

  previewScenarioMaps(
    scenarioId: string,
    body: { project_id: number; payload?: Record<string, unknown> },
  ) {
    return this.client.post<{ preview?: Record<string, unknown>; field_maps_count?: number }>(
      `/integrations/scenarios/${scenarioId}/map-preview`,
      body,
    );
  }

  listScenarioRuns(scenarioId: string, projectId: number, limit = 50) {
    return integrationListScenarioRuns(this.client, scenarioId, projectId, limit).then((res) => {
      const parsed = ListScenarioRunsResponseSchema.safeParse(res.data);
      if (parsed.success) {
        return { ...res, data: parsed.data };
      }
      return res;
    });
  }

  /** Start OAuth 2.0 PKCE authorization (open ``authorization_url`` in the browser). */
  oauthBegin(
    provider: string,
    body: { connection_id: string; redirect_after?: string; scopes?: string[] },
  ) {
    return this.client.post<{
      authorization_url: string;
      state: string;
      connection_id: string;
      provider: string;
      redirect_uri: string;
    }>(`/integrations/oauth/${encodeURIComponent(provider)}/begin`, body);
  }

  /** OAuth callback is handled via browser redirect to ``GET /integrations/oauth/{provider}/callback``. */

  refreshToken(connectionId: string, force = false) {
    return this.client.post<{
      refreshed: boolean;
      connection_id: string;
      provider?: string;
      has_access_token?: boolean;
    }>(`/integrations/connections/${connectionId}/refresh-token`, {}, {
      params: { force },
    });
  }

  /** Register provider inbound webhook (post-OAuth retry; idempotent). */
  activateConnectionWebhook(connectionId: string) {
    return this.client.post<{
      success: boolean;
      connection_id: string;
      provider: string;
      hook_url: string;
      auto_activated?: boolean;
      activation?: Record<string, unknown>;
    }>(`/integrations/connections/${connectionId}/activate-webhook`, {});
  }

  updateConnection(
    connectionId: string,
    body: {
      label?: string;
      status?: string;
      config?: Record<string, unknown>;
      direction?: string;
    },
  ) {
    return this.client.patch<{ success: boolean; connection: unknown }>(
      `/integrations/connections/${connectionId}`,
      body,
    );
  }
}
