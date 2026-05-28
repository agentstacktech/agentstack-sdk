/**
 * Typed Integration Hub GET/query helpers (flat query) — genetic: ``sdk.integrations.gen1``.
 * Single transport surface for list/read calls; {@link AgentIntegrations} delegates here (ISP).
 */

import type { HTTPClient } from '../client/http-client';
import type {
  IntegrationOwnerKind,
  IntegrationRecipeManifest,
  ListInboxEventsResponse,
} from '../types/integrations';

export interface ListIntegrationConnectionsParams {
  owner_kind: IntegrationOwnerKind;
  project_id: number;
  user_id?: number;
  provider?: string;
}

export interface ListIntegrationRecipesFilters {
  provider?: string;
  category?: string;
  q?: string;
}

function compactQuery<T extends Record<string, string | number | undefined | null>>(
  obj: T,
): Record<string, string | number> | undefined {
  const out: Record<string, string | number> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue;
    out[k] = v as string | number;
  }
  return Object.keys(out).length ? out : undefined;
}

export function integrationListRecipes(
  client: HTTPClient,
  filters?: ListIntegrationRecipesFilters,
) {
  const q = compactQuery({
    provider: filters?.provider,
    category: filters?.category,
    q: filters?.q,
  });
  return client.get<{ recipes: IntegrationRecipeManifest[]; total: number }>(
    '/integrations/recipes',
    q,
    { skipBatching: true, skipCache: true },
  );
}

export function integrationListConnections(
  client: HTTPClient,
  params: ListIntegrationConnectionsParams,
) {
  return client.get<{ connections: unknown[]; total: number }>('/integrations/connections', {
    owner_kind: params.owner_kind,
    project_id: params.project_id,
    ...(params.user_id !== undefined ? { user_id: params.user_id } : {}),
    ...(params.provider !== undefined ? { provider: params.provider } : {}),
  }, { skipBatching: true, skipCache: true });
}

export interface IntegrationListScope {
  owner_kind: IntegrationOwnerKind;
  project_id: number;
  user_id?: number;
  connection_id?: string;
  limit?: number;
}

export function integrationListDeliveries(
  client: HTTPClient,
  scope: IntegrationListScope,
) {
  const limit = scope.limit ?? 50;
  return client.get<{ deliveries: unknown[]; total: number }>(
    '/integrations/deliveries',
    {
      project_id: scope.project_id,
      owner_kind: scope.owner_kind,
      limit,
      ...(scope.user_id !== undefined ? { user_id: scope.user_id } : {}),
      ...(scope.connection_id ? { connection_id: scope.connection_id } : {}),
    },
    { skipBatching: true, skipCache: true },
  );
}

export function integrationListInboxEvents(
  client: HTTPClient,
  scope: IntegrationListScope & { status?: string },
) {
  return client.get<ListInboxEventsResponse>(
    '/integrations/inbox/events',
    {
      project_id: scope.project_id,
      owner_kind: scope.owner_kind,
      ...(scope.limit !== undefined ? { limit: scope.limit } : {}),
      ...(scope.status !== undefined ? { status: scope.status } : {}),
      ...(scope.user_id !== undefined ? { user_id: scope.user_id } : {}),
      ...(scope.connection_id ? { connection_id: scope.connection_id } : {}),
    },
    { skipBatching: true, skipCache: true },
  );
}

export function integrationListIssues(client: HTTPClient, scope: IntegrationListScope) {
  return client.get<{ issues: unknown[]; total: number }>(
    '/integrations/issues',
    {
      project_id: scope.project_id,
      owner_kind: scope.owner_kind,
      limit: scope.limit ?? 50,
      ...(scope.user_id !== undefined ? { user_id: scope.user_id } : {}),
      ...(scope.connection_id ? { connection_id: scope.connection_id } : {}),
    },
    { skipBatching: true, skipCache: true },
  );
}

export function integrationGetDiagnostics(client: HTTPClient, projectId: number) {
  return client.get<{
    project_id: number;
    rollup_7d: Record<string, unknown>;
    connections_count: number;
    hints?: string[];
    runbook?: string;
  }>('/integrations/diagnostics', { project_id: projectId }, { skipBatching: true, skipCache: true });
}

export function integrationGetConnectorSetupSchema(client: HTTPClient, provider: string) {
  return client.get<{ provider: string; schema: unknown }>(
    '/integrations/connectors/setup-schema',
    { provider },
    { skipBatching: true, skipCache: true },
  );
}

/** Namespace export for consumers that prefer a single import. */
export const integrationQueries = {
  listRecipes: integrationListRecipes,
  listConnections: integrationListConnections,
  listDeliveries: integrationListDeliveries,
  listInboxEvents: integrationListInboxEvents,
  listIssues: integrationListIssues,
  getDiagnostics: integrationGetDiagnostics,
  getConnectorSetupSchema: integrationGetConnectorSetupSchema,
};
