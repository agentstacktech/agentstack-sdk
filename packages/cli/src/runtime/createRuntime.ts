/**
 * CliRuntime — composition root (SDK + MCP + config).
 * Genetic tag: repo.tooling.user_cli.gen1
 */

import {
  AgentStackSDK,
  resolveAgentStackApiBase,
  resolveMcpUrl,
  type McpExecuteOptions,
  type McpStep,
} from '@agentstack/sdk';
import {
  loadConfig,
  mergeEnvOverrides,
  saveConfig,
  type CliConfig,
} from './configStore.js';
import { printResult, type OutputMode } from './output.js';

export interface GlobalFlags {
  json?: boolean;
  quiet?: boolean;
  project?: number;
  profile?: string;
  apiBase?: string;
  trace?: boolean;
}

export interface CliRuntime {
  sdk: AgentStackSDK;
  config: CliConfig;
  apiKey: string | undefined;
  projectId: number | undefined;
  apiBase: string;
  mcpUrl: string;
  output: OutputMode;
  trace: boolean;
  requireAuth(): string;
  requireProject(): number;
  mcp(
    steps: McpStep[],
    overrides?: Partial<McpExecuteOptions>,
  ): Promise<Awaited<ReturnType<AgentStackSDK['mcp']['execute']>>>;
  print(data: unknown, message?: string): void;
  saveProfile(patch: {
    apiKey?: string | null;
    /** Pass `null` to clear pinned project on the active profile */
    projectId?: number | null;
  }): Promise<void>;
}

export async function createRuntime(flags: GlobalFlags = {}): Promise<CliRuntime> {
  let config = await loadConfig();
  if (flags.profile) config = { ...config, activeProfile: flags.profile };
  if (flags.apiBase) config = { ...config, apiBase: flags.apiBase };

  const env = { ...process.env };
  if (flags.profile) env.AGENTSTACK_PROFILE = flags.profile;
  if (flags.apiBase) env.AGENTSTACK_API_BASE = flags.apiBase;
  if (flags.project != null) env.AGENTSTACK_PROJECT_ID = String(flags.project);

  const merged = mergeEnvOverrides(config, env);
  const apiBase = flags.apiBase || merged.apiBase || resolveAgentStackApiBase();
  const mcpUrl = merged.mcpUrl || resolveMcpUrl(apiBase);
  const projectId = flags.project ?? merged.projectId;
  const apiKey = merged.apiKey;

  const sdk = new AgentStackSDK({
    apiBase,
    apiKey,
    projectId,
    sdkAudience: 'integrator',
  });
  if (apiKey) sdk.platform.auth.useApiKey(apiKey, projectId);

  const output: OutputMode = flags.quiet
    ? 'quiet'
    : flags.json || config.output === 'json'
      ? 'json'
      : 'human';

  const rt: CliRuntime = {
    sdk,
    config,
    apiKey,
    projectId,
    apiBase,
    mcpUrl,
    output,
    trace: Boolean(flags.trace),
    requireAuth() {
      if (!rt.apiKey) throw new Error('missing token — run: agentstack auth login');
      return rt.apiKey;
    },
    requireProject() {
      if (rt.projectId == null || !Number.isFinite(rt.projectId)) {
        throw new Error('missing project — run: agentstack auth use-project <id>');
      }
      return rt.projectId;
    },
    async mcp(steps, overrides) {
      const token = overrides?.token ?? rt.requireAuth();
      const pid = overrides?.projectId ?? rt.requireProject();
      return rt.sdk.mcp.execute(steps, {
        token,
        projectId: Number(pid),
        mcpUrl: overrides?.mcpUrl ?? rt.mcpUrl,
        idempotencyKey: overrides?.idempotencyKey,
        stopOnError: overrides?.stopOnError,
        timeoutMs: overrides?.timeoutMs,
        maxAttempts: overrides?.maxAttempts,
      });
    },
    print(data, message) {
      printResult(data, rt.output, { message });
    },
    async saveProfile(patch) {
      const name = rt.config.activeProfile || 'default';
      const profiles = { ...rt.config.profiles };
      const next = { ...profiles[name] };
      if ('apiKey' in patch) {
        if (patch.apiKey == null || patch.apiKey === '') delete next.apiKey;
        else next.apiKey = patch.apiKey;
      }
      if ('projectId' in patch) {
        if (patch.projectId == null) delete next.projectId;
        else next.projectId = patch.projectId;
      }
      profiles[name] = next;
      rt.config = {
        ...rt.config,
        activeProfile: name,
        profiles,
        defaultProjectId:
          'projectId' in patch
            ? patch.projectId ?? undefined
            : rt.config.defaultProjectId,
        apiBase: rt.apiBase,
      };
      await saveConfig(rt.config);
      if ('apiKey' in patch) {
        rt.apiKey = patch.apiKey || undefined;
      }
      if ('projectId' in patch) {
        rt.projectId =
          patch.projectId != null && Number.isFinite(patch.projectId)
            ? patch.projectId
            : undefined;
        if (rt.projectId != null) rt.sdk.updateProjectId(rt.projectId);
        else rt.sdk.updateConfig({ projectId: undefined });
      }
      // Always rebind — logout / empty profile must not keep previous Bearer
      if ('apiKey' in patch || 'projectId' in patch) {
        rt.sdk.platform.auth.useApiKey(rt.apiKey || '', rt.projectId);
      }
    },
  };
  return rt;
}
