/**
 * MCP + Device Code surface for headless / CLI clients.
 * Genetic tag: repo.tooling.user_cli.gen1
 */

export {
  resolveMcpUrl,
  resolveMcpAuthToken,
  resolvePublicOrigin,
} from './urls';
export {
  mcpExecute,
  isMcpPartialSuccess,
  summarizeMcpBatchOutcome,
  readInverseEnvelope,
  type McpStep,
  type McpExecuteOptions,
  type McpExecuteResult,
  type McpStepResult,
  type InverseEnvelope,
} from './execute';
export {
  simulatePatAction,
  simulatePatActionWithToken,
  type PatActionSimulation,
  type PatSimulationL1,
  type PatSimulationL2,
  type SimulatePatActionOpts,
  type McpExecuteClient,
} from './permissions';
export {
  loginWithDeviceCodeForm,
  deviceCodeActivateUrl,
  DEFAULT_DEVICE_SCOPES,
  type DeviceCodeLoginOptions,
  type DeviceAuthorizeResult,
} from './deviceCode';
export {
  pickDiscoveryNextStep,
  type DiscoverySearchResponse,
  type RecommendedAction,
} from './discoveryClient';
export {
  mcpDiscoverByIntent,
  mcpGetDiscovery,
  type McpDiscoverOptions,
  type McpDiscoverByIntentResult,
  type McpDiscoverIntentRow,
} from './discover';
export {
  resolveGoalRoute,
  goalRoutePlaybookId,
  type GoalRouteResult,
  type ResolveGoalRouteOptions,
} from './goalRoute';
export {
  MCP_GUIDANCE_PROMPTS,
  MCP_GUIDANCE_URLS,
  MCP_ONBOARDING_RECIPE_IDS,
  MCP_EXTENDED_RECIPE_IDS,
  recommendedMcpPrompts,
  recommendedMcpRecipes,
  recommendedDiscoveryLadder,
  discoveryLadderSteps,
  httpBootstrapLadderSteps,
  closedLoopLadderSteps,
  WORK_GRAPH_HARNESS_INVARIANTS,
  WORK_GRAPH_WHEN_BLOCKED,
  WORK_GRAPH_WHEN_BLOCKED_LOCALES,
  WAVE_XIX_ATOM_LOCALES,
  sessionSetupLadderPhases,
  type McpSessionSetupLadderPhase,
  type McpClosedLoopLadderStep,
  type McpHttpBootstrapLadderStep,
  buildMcpCatalogActionsUrl,
  mergeMcpCatalogDelta,
  resolveMcpGuidanceUrl,
  readPublicMcpResource,
  readPublicMcpOnboardingBundle,
  readPublicMcpWorkGraphLadder,
  fetchMcpActionsSummary,
  getMcpCatalogFacts,
  formatMcpCatalogShorthandSocial,
  formatMcpCatalogShorthandSeo,
  fetchMcpAiPrompt,
  type McpActionsSummary,
  type McpCatalogFacts,
  mcpListOrgans,
  type McpListOrgansOptions,
  mcpListActions,
  type McpListActionsOptions,
  refreshMcpCatalogWithDelta,
  type RefreshMcpCatalogWithDeltaOptions,
  runMcpPreflight,
  fetchMcpPreflight,
  DEFAULT_MCP_LIST_PROJECTION,
  buildMcpUserContext,
  parseListProjection,
  fetchDiscoveryStatus,
  fetchDiscoverySearch,
  type Bcp47Locale,
  type DiscoverySearchParams,
  type RunMcpPreflightOptions,
  type DiscoveryStatusPayload,
  type DiscoveryStatusNextAction,
  type DiscoverySearchResult,
  type DiscoverySearchRecipeMatch,
  type ProductArchetypeMatch,
  type GtpiDebugPayload,
  type GtpiDebugBinding,
  type McpListProjection,
  buildFlowReceipt,
  buildCertificationReceipt,
  runMcpCertificationRecipe,
  MCP_CERTIFICATION_RECIPE_ID,
  type DiscoveryStatusDomainSlice,
  type FlowReceipt,
  type McpAiPromptMode,
  type FetchMcpAiPromptOptions,
  type McpClientManifest,
  type McpClientManifestClient,
  parseMcpClientManifest,
} from './guidance';
export {
  buildMcpCatalogActionsUrl as buildCatalogActionsUrl,
  mergeMcpCatalogDelta as mergeCatalogDelta,
  isCatalogDeltaPayload,
  type McpCatalogDeltaPayload,
} from './catalogDelta';
export {
  inferDocAudience,
  filterTenantActions,
  type DocAudience,
  type CatalogActionMeta,
} from './catalogFilter';
export {
  flattenMcpActionsCatalog,
  actionsFromSnapshot,
} from './catalogFlatten';
export {
  mcpCapabilityDescriptorSlimSchema,
  parseMcpCapabilityDescriptorSlim,
  mcpCatalogActionRowSchema,
  parseMcpCatalogActionRow,
  type McpCapabilityDescriptorSlim,
  type McpCapabilityDescriptorSource,
  type McpCatalogActionRow,
} from '../fabric/capabilityDescriptor';

import { mcpExecute, type McpStep, type McpExecuteOptions } from './execute';
import { resolveMcpUrl, resolveMcpAuthToken } from './urls';
import { loginWithDeviceCodeForm, type DeviceCodeLoginOptions } from './deviceCode';
import { mcpDiscoverByIntent, mcpGetDiscovery } from './discover';
import {
  fetchDiscoveryStatus,
  fetchDiscoverySearch,
  fetchMcpActionsSummary,
  fetchMcpAiPrompt,
  mcpListActions,
  mcpListOrgans,
  refreshMcpCatalogWithDelta,
  runMcpCertificationRecipe,
  runMcpPreflight,
  type DiscoveryStatusPayload,
  type FetchMcpAiPromptOptions,
  type McpAiPromptMode,
  type McpListActionsOptions,
  type McpListOrgansOptions,
  type RefreshMcpCatalogWithDeltaOptions,
  type RunMcpPreflightOptions,
} from './guidance';

/** Facade attached as `sdk.mcp`. */
export class AgentMcp {
  constructor(
    private readonly getApiBase: () => string,
    private readonly getToken: () => string | undefined,
    private readonly getProjectId: () => number | undefined,
  ) {}

  resolveUrl(): string {
    return resolveMcpUrl(this.getApiBase());
  }

  /** Manual day-ring correction — wraps `analytics.bump` MCP action. */
  async analyticsBump(params: {
    project_id?: number;
    deltas: Record<string, number>;
    epoch_day?: number;
    hour?: number;
    minute?: number;
  }): Promise<Awaited<ReturnType<typeof mcpExecute>>> {
    const allowed = new Set(['ae', 'ee', 'pe', 'rc', 'ec', 'eo']);
    for (const key of Object.keys(params.deltas)) {
      if (!allowed.has(key) && !key.startsWith('ev.')) {
        throw new Error(`analytics.bump: unknown catalog key "${key}"`);
      }
    }
    return this.execute([
      {
        action: 'analytics.bump',
        params: {
          project_id: params.project_id,
          deltas: params.deltas,
          epoch_day: params.epoch_day,
          hour: params.hour,
          minute: params.minute,
        },
      },
    ]);
  }

  async execute(
    steps: McpStep[],
    overrides?: Partial<McpExecuteOptions>,
  ): Promise<Awaited<ReturnType<typeof mcpExecute>>> {
    const token = overrides?.token ?? this.getToken() ?? resolveMcpAuthToken();
    if (!token) throw new Error('mcp.execute: missing token (set AGENTSTACK_API_KEY)');
    const projectId = overrides?.projectId ?? this.getProjectId();
    if (projectId == null || !Number.isFinite(Number(projectId))) {
      throw new Error('mcp.execute: missing projectId');
    }
    return mcpExecute(steps, {
      token,
      projectId: Number(projectId),
      mcpUrl: overrides?.mcpUrl ?? this.resolveUrl(),
      idempotencyKey: overrides?.idempotencyKey,
      recipeId: overrides?.recipeId,
      goal: overrides?.goal,
      observed: overrides?.observed,
      workflowRunId: overrides?.workflowRunId,
      density: overrides?.density,
      stopOnError: overrides?.stopOnError,
      timeoutMs: overrides?.timeoutMs,
      maxAttempts: overrides?.maxAttempts,
    });
  }

  async loginWithDeviceCode(
    opts: Omit<DeviceCodeLoginOptions, 'apiBase'> & { apiBase?: string },
  ): Promise<Record<string, unknown>> {
    return loginWithDeviceCodeForm({
      ...opts,
      apiBase: opts.apiBase ?? this.getApiBase(),
    });
  }

  /** Intent search — POST /mcp/discover/by_intent (REST, not JSON-RPC). */
  async discoverByIntent(
    intent: string,
    overrides?: Partial<{ token: string; projectId: number; locale: string }>,
  ): Promise<unknown> {
    const token = overrides?.token ?? this.getToken() ?? resolveMcpAuthToken();
    if (!token) throw new Error('mcp.discoverByIntent: missing token');
    const projectId = overrides?.projectId ?? this.getProjectId();
    if (projectId == null || !Number.isFinite(Number(projectId))) {
      throw new Error('mcp.discoverByIntent: missing projectId');
    }
    return mcpDiscoverByIntent(intent, {
      apiBase: this.getApiBase(),
      token,
      projectId: Number(projectId),
      locale: overrides?.locale,
    });
  }

  /** Capability context — GET /mcp/discovery. */
  async getDiscovery(
    overrides?: Partial<{ token: string; projectId: number }>,
  ): Promise<unknown> {
    const token = overrides?.token ?? this.getToken() ?? resolveMcpAuthToken();
    if (!token) throw new Error('mcp.getDiscovery: missing token');
    const projectId = overrides?.projectId ?? this.getProjectId();
    return mcpGetDiscovery({
      apiBase: this.getApiBase(),
      token,
      ...(projectId != null ? { projectId: Number(projectId) } : {}),
    });
  }

  async fetchActionsSummary(): Promise<{ total_actions: number; version?: string }> {
    return fetchMcpActionsSummary(this.getApiBase());
  }

  async listActions(overrides?: Partial<McpListActionsOptions>): Promise<unknown> {
    const token = overrides?.token ?? this.getToken() ?? resolveMcpAuthToken();
    if (!token) throw new Error('mcp.listActions: missing token');
    return mcpListActions({
      apiBase: overrides?.apiBase ?? this.getApiBase(),
      token,
      hot: overrides?.hot,
      sinceEtag: overrides?.sinceEtag,
      delta: overrides?.delta,
    });
  }

  async refreshCatalogWithDelta(
    opts: Omit<RefreshMcpCatalogWithDeltaOptions, 'apiBase' | 'token'> & {
      token?: string;
      apiBase?: string;
    },
  ): Promise<{ actions: unknown[]; catalogEtag?: string }> {
    const token = opts.token ?? this.getToken() ?? resolveMcpAuthToken();
    if (!token) throw new Error('mcp.refreshCatalogWithDelta: missing token');
    return refreshMcpCatalogWithDelta({
      ...opts,
      apiBase: opts.apiBase ?? this.getApiBase(),
      token,
    });
  }

  async fetchAiPrompt(
    overrides?: Partial<FetchMcpAiPromptOptions>,
  ): Promise<Record<string, unknown>> {
    const token = overrides?.token ?? this.getToken() ?? resolveMcpAuthToken();
    if (!token) throw new Error('mcp.fetchAiPrompt: missing token');
    return fetchMcpAiPrompt({
      apiBase: overrides?.apiBase ?? this.getApiBase(),
      token,
      mode: overrides?.mode,
    }) as Promise<Record<string, unknown>>;
  }

  async listOrgans(overrides?: Partial<McpListOrgansOptions>): Promise<unknown> {
    const token = overrides?.token ?? this.getToken() ?? resolveMcpAuthToken();
    if (!token) throw new Error('mcp.listOrgans: missing token');
    return mcpListOrgans({
      apiBase: overrides?.apiBase ?? this.getApiBase(),
      token,
      domain: overrides?.domain,
      kind: overrides?.kind,
    });
  }

  async runMcpCertificationRecipe(
    overrides?: Partial<{
      apiBase: string;
      token: string;
      projectId: number;
      idempotencyKey: string;
    }>,
  ): Promise<Awaited<ReturnType<typeof runMcpCertificationRecipe>>> {
    const token = overrides?.token ?? this.getToken() ?? resolveMcpAuthToken();
    if (!token) throw new Error('mcp.runMcpCertificationRecipe: missing token');
    const projectId = overrides?.projectId ?? this.getProjectId();
    if (projectId == null || !Number.isFinite(Number(projectId))) {
      throw new Error('mcp.runMcpCertificationRecipe: missing projectId');
    }
    return runMcpCertificationRecipe({
      apiBase: overrides?.apiBase ?? this.getApiBase(),
      token,
      projectId: Number(projectId),
      idempotencyKey: overrides?.idempotencyKey,
    });
  }

  async fetchDiscoveryStatus(
    overrides?: Partial<{ apiBase: string; token: string; projectId: number; locale: string }>,
  ): Promise<DiscoveryStatusPayload> {
    const token = overrides?.token ?? this.getToken() ?? resolveMcpAuthToken();
    if (!token) throw new Error('mcp.fetchDiscoveryStatus: missing token');
    return fetchDiscoveryStatus({
      apiBase: overrides?.apiBase ?? this.getApiBase(),
      token,
      projectId: overrides?.projectId ?? this.getProjectId() ?? 1,
      locale: overrides?.locale,
    });
  }

  async fetchDiscoverySearch(
    q: string,
    overrides?: Partial<{
      apiBase: string;
      token: string;
      projectId: number;
      locale: string;
      limit: number;
    }>,
  ): Promise<DiscoverySearchResult> {
    const token = overrides?.token ?? this.getToken() ?? resolveMcpAuthToken();
    if (!token) throw new Error('mcp.fetchDiscoverySearch: missing token');
    return fetchDiscoverySearch({
      apiBase: overrides?.apiBase ?? this.getApiBase(),
      token,
      projectId: overrides?.projectId ?? this.getProjectId() ?? 1,
      q,
      locale: overrides?.locale,
      limit: overrides?.limit,
    });
  }

  async preflight(
    overrides?: Partial<RunMcpPreflightOptions>,
  ): Promise<unknown> {
    const token = overrides?.token ?? this.getToken() ?? resolveMcpAuthToken();
    if (!token) throw new Error('mcp.preflight: missing token');
    const projectId = overrides?.projectId ?? this.getProjectId();
    if (projectId == null || !Number.isFinite(Number(projectId))) {
      throw new Error('mcp.preflight: missing projectId');
    }
    return runMcpPreflight({
      apiBase: overrides?.apiBase ?? this.getApiBase(),
      token,
      projectId: Number(projectId),
      requiredCaps: overrides?.requiredCaps,
    });
  }
}
