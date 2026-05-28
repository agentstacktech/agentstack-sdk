/**
 * AgentStack platform-operator REST (`/api/admin/agentnet/*`).
 *
 * **Not** on `sdk.platform` — for ecosystem owners (typically `project_id=1` / AgentStack ops).
 * Tenant apps use {@link AgentEconomyFacade} via `sdk.platform.economy` (`/api/agentnet/{project_id}/*`).
 *
 * Gene: `core.economy.agentnet.gen1` (table names remain `data_agentcoin_*`)
 */

import { HTTPClient } from '../client/http-client';
import { ADMIN_AGENTNET_OPENAPI_PATHS } from '../generated/admin-agentnet-paths';
import type { GenomeLineageRecord } from '../economy/genomeExecutionContext';

/** Canonical admin prefix (must match `admin_agentcoin_endpoints` router). */
const ADMIN_AGENTNET_PREFIX = '/admin/agentnet';

function assertAdminPathsInSync(): void {
  const expected: Record<string, string> = {
    overview: `${ADMIN_AGENTNET_PREFIX}/overview`,
    networkDashboard: `${ADMIN_AGENTNET_PREFIX}/network-dashboard`,
    demoEvidenceBundle: `${ADMIN_AGENTNET_PREFIX}/demo-evidence-bundle`,
    grantMetrics: `${ADMIN_AGENTNET_PREFIX}/grant-metrics`,
    hubSnapshot: `${ADMIN_AGENTNET_PREFIX}/hub-snapshot`,
  };
  for (const [key, path] of Object.entries(expected)) {
    const k = key as keyof typeof ADMIN_AGENTNET_OPENAPI_PATHS;
    if (ADMIN_AGENTNET_OPENAPI_PATHS[k] !== path) {
      throw new Error(
        `ADMIN_AGENTNET_OPENAPI_PATHS.${key} out of sync — run scripts/export-openapi-admin-agentnet.py`,
      );
    }
  }
}
assertAdminPathsInSync();

export interface AgentcoinDdlPolicyDto {
  ddl_reset_allowed: boolean;
  ddl_reset_reason: string;
  app_env: string;
  admin_ddl_allow_env: boolean;
  ddl_staging_override_env: boolean;
}

export interface AgentcoinPackedIn8DnaEntry {
  entity: string;
  path: string;
}

export interface AgentcoinSchemaStatusPayload {
  substrate_version?: string;
  m_plus_core_present?: boolean;
  m_plus_missing?: string[];
  required_relations: string[];
  deprecated_relations: string[];
  packed_in_8dna: AgentcoinPackedIn8DnaEntry[];
  to_regclass: Record<string, boolean>;
  column_signals: Record<string, boolean>;
  stored_migration_version: null;
  stored_migration_version_note: string;
  schema_503_responses_total_process: number;
  hints: string[];
  ddl_policy: AgentcoinDdlPolicyDto;
}

export interface AgentcoinChainSurfacePayload {
  chain_id: number | null;
  evm_chain_id_raw: string | null;
  explorer_base_url: string | null;
  read_only_rpc_configured: boolean;
  read_only_rpc_host_hint: string | null;
  read_only_rpc_ping_ok: boolean;
  checkpoint_anchor_address_masked: string | null;
  agnt_contract_address_masked: string | null;
  agc_contract_address_masked?: string | null;
  vault_address_masked?: string | null;
  usdt_address_masked?: string | null;
  validation_registry_address_masked?: string | null;
  adr_links: string[];
  cache_ttl_seconds: number;
}

export interface AgentcoinSchemaResetModePayload {
  async_supported: boolean;
  http_mode: string;
  ddl_policy: AgentcoinDdlPolicyDto;
}

export type AgentcoinSchemaResetScope = 'ledger_core' | 'bridge_aux' | 'full';

export interface AgentcoinSchemaResetBody {
  scope: AgentcoinSchemaResetScope;
  /** Must equal ``RESET AGENTCOIN L0`` (server-enforced). */
  confirm_token: string;
}

export interface AgentcoinSchemaResetResult {
  ok: boolean;
  scope: string;
  dropped_tables: string[];
  migrations: Record<string, unknown>;
  async_supported: boolean;
}

export interface AgentcoinDiagnosticsProblemItem {
  id: string;
  severity?: string;
  title?: string;
  message?: string;
  hint?: string;
  source?: string;
  timestamp?: string;
}

export interface AgentcoinBridgeHealthPayload {
  available: boolean;
  reason?: string;
  open_intents?: number;
  paused_intents?: number;
  paused_bridge_intents?: number;
  last_bridge_event_at?: string | null;
  latest_posted_batch_id?: number | null;
  batch_slow_sub?: Record<string, unknown>;
  overview_timings_ms?: { total?: number };
}

export interface AgentcoinAdminOverviewPayload {
  schema: AgentcoinSchemaStatusPayload;
  chain: AgentcoinChainSurfacePayload;
  problems: {
    problems: AgentcoinDiagnosticsProblemItem[];
    timestamp?: string;
    agentcoin_schema?: Record<string, unknown> | null;
  };
  bridge_health?: AgentcoinBridgeHealthPayload;
  bsc_rail?: {
    enabled?: boolean;
    rpc_ok?: boolean;
    [key: string]: unknown;
  };
}

export class AgentAdmin {
  constructor(private readonly http: HTTPClient) {}

  // --- AgentCoin ledger admin ---

  async getAgentcoinAdminOverview(opts?: { signal?: AbortSignal }): Promise<AgentcoinAdminOverviewPayload> {
    const res = await this.http.get<AgentcoinAdminOverviewPayload>(
      ADMIN_AGENTNET_OPENAPI_PATHS.overview,
      { skipBatching: true, signal: opts?.signal },
    );
    return res.data;
  }

  // --- AgentNet network admin ---

  async getAgentnetNetworkHealth(
    projectId = 1,
    opts?: { signal?: AbortSignal },
  ): Promise<Record<string, unknown>> {
    const res = await this.http.get<Record<string, unknown>>(
      `${ADMIN_AGENTNET_OPENAPI_PATHS.networkHealth}?project_id=${projectId}`,
      { skipBatching: true, signal: opts?.signal },
    );
    return res.data;
  }

  /** Read-only network config snapshot (alias of {@link getAgentnetNetworkHealth}). */
  async getAgentnetNetworkConfig(
    projectId = 1,
    opts?: { signal?: AbortSignal },
  ): Promise<Record<string, unknown>> {
    return this.getAgentnetNetworkHealth(projectId, opts);
  }

  async getAgentnetNetworkDashboard(
    projectId = 1,
    opts?: { signal?: AbortSignal },
  ): Promise<Record<string, unknown>> {
    const res = await this.http.get<Record<string, unknown>>(
      `${ADMIN_AGENTNET_OPENAPI_PATHS.networkDashboard}?project_id=${projectId}`,
      { skipBatching: true, signal: opts?.signal },
    );
    return res.data;
  }

  async getAgentnetDemoEvidenceBundle(
    projectId = 1,
    opts?: { signal?: AbortSignal },
  ): Promise<Record<string, unknown>> {
    const res = await this.http.get<Record<string, unknown>>(
      `${ADMIN_AGENTNET_OPENAPI_PATHS.demoEvidenceBundle}?project_id=${projectId}`,
      { skipBatching: true, signal: opts?.signal },
    );
    return res.data;
  }

  async getAgentnetLaunchReadiness(
    projectId = 1,
    opts?: { signal?: AbortSignal },
  ): Promise<Record<string, unknown>> {
    const res = await this.http.get<Record<string, unknown>>(
      `${ADMIN_AGENTNET_OPENAPI_PATHS.launchReadiness}?project_id=${projectId}`,
      { skipBatching: true, signal: opts?.signal },
    );
    return res.data;
  }

  async getAgentnetGrantMetrics(opts?: { signal?: AbortSignal }): Promise<{
    slice: Record<string, unknown>;
    available: boolean;
  }> {
    const res = await this.http.get<{ slice: Record<string, unknown>; available: boolean }>(
      ADMIN_AGENTNET_OPENAPI_PATHS.grantMetrics,
      { skipBatching: true, signal: opts?.signal },
    );
    return res.data;
  }

  async getAgentnetHubSnapshot(
    projectId = 1,
    opts?: { signal?: AbortSignal; excludeBlanks?: boolean },
  ): Promise<Record<string, unknown>> {
    const q = new URLSearchParams({
      project_id: String(projectId),
      exclude_blanks: opts?.excludeBlanks === false ? 'false' : 'true',
    });
    const res = await this.http.get<Record<string, unknown>>(
      `${ADMIN_AGENTNET_OPENAPI_PATHS.hubSnapshot}?${q}`,
      { skipBatching: true, signal: opts?.signal },
    );
    return res.data;
  }

  /**
   * @deprecated Prefer {@link getAgentcoinAdminOverview} for read paths (single round-trip).
   */
  async getAgentcoinSchemaStatus(opts?: { signal?: AbortSignal }): Promise<AgentcoinSchemaStatusPayload> {
    const res = await this.http.get<AgentcoinSchemaStatusPayload>(
      ADMIN_AGENTNET_OPENAPI_PATHS.schemaStatus,
      {
      skipBatching: true,
      signal: opts?.signal,
      },
    );
    return res.data;
  }

  /**
   * @deprecated Prefer {@link getAgentcoinAdminOverview} for read paths (single round-trip).
   */
  async getAgentcoinChainSurface(opts?: { signal?: AbortSignal }): Promise<AgentcoinChainSurfacePayload> {
    const res = await this.http.get<AgentcoinChainSurfacePayload>(
      ADMIN_AGENTNET_OPENAPI_PATHS.chainSurface,
      {
      skipBatching: true,
      signal: opts?.signal,
      },
    );
    return res.data;
  }

  async getAgentcoinSchemaResetMode(opts?: { signal?: AbortSignal }): Promise<AgentcoinSchemaResetModePayload> {
    const res = await this.http.get<AgentcoinSchemaResetModePayload>(
      ADMIN_AGENTNET_OPENAPI_PATHS.schemaResetMode,
      { skipBatching: true, signal: opts?.signal },
    );
    return res.data;
  }

  async postAgentcoinSchemaReset(body: AgentcoinSchemaResetBody): Promise<AgentcoinSchemaResetResult> {
    const res = await this.http.post<AgentcoinSchemaResetResult>(
      ADMIN_AGENTNET_OPENAPI_PATHS.schemaReset,
      body,
      { skipBatching: true },
    );
    return res.data;
  }

  async getAgentnetReconciliationSnapshot(
    projectId = 1,
    opts?: { signal?: AbortSignal },
  ): Promise<Record<string, unknown>> {
    const res = await this.http.get<Record<string, unknown>>(
      `${ADMIN_AGENTNET_OPENAPI_PATHS.reconciliationSnapshot}?project_id=${projectId}`,
      { skipBatching: true, signal: opts?.signal },
    );
    return res.data;
  }

  /** Read-only genome lineage (ecosystem owner). MCP parity: `agentnet.genome.get`. */
  async getAgentnetGenomeLineage(
    entityId: string,
    opts?: { signal?: AbortSignal },
  ): Promise<{ entity_id: string; lineage: GenomeLineageRecord | null; available: boolean }> {
    const encoded = encodeURIComponent(entityId);
    const path = ADMIN_AGENTNET_OPENAPI_PATHS.genomeEntityId.replace('{entity_id}', encoded);
    const res = await this.http.get<{
      entity_id: string;
      lineage: GenomeLineageRecord | null;
      available: boolean;
    }>(path, { skipBatching: true, signal: opts?.signal });
    return res.data;
  }
}
