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
  type McpStep,
  type McpExecuteOptions,
  type McpExecuteResult,
  type McpStepResult,
} from './execute';
export {
  loginWithDeviceCodeForm,
  deviceCodeActivateUrl,
  DEFAULT_DEVICE_SCOPES,
  type DeviceCodeLoginOptions,
  type DeviceAuthorizeResult,
} from './deviceCode';
export {
  mcpDiscoverByIntent,
  mcpGetDiscovery,
  type McpDiscoverOptions,
} from './discover';
export {
  MCP_GUIDANCE_PROMPTS,
  MCP_GUIDANCE_URLS,
  MCP_ONBOARDING_RECIPE_IDS,
  recommendedMcpPrompts,
  recommendedMcpRecipes,
  resolveMcpGuidanceUrl,
  fetchMcpActionsSummary,
  mcpListOrgans,
  type McpListOrgansOptions,
  mcpListActions,
  type McpListActionsOptions,
} from './guidance';
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
    overrides?: Partial<{ token: string; projectId: number }>,
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
}
