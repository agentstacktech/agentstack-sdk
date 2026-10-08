/**
 * Tenant sandbox REST client (thin wrapper over HTTPClient /api/sandbox).
 * Genetic tag: core.sandbox.generation.gen1
 */

import type { HTTPClient } from '../client/http-client';
import { applyPromoteGatesPolicy, type GenerationSettingsLike } from './promotePolicy';

export {
  applyPromoteGatesPolicy,
  resolveRequireGatesPassed,
} from './promotePolicy';
export type { PromoteBodyLike } from './promotePolicy';
export {
  allowsAutoPromote,
  approvalGateRequired,
  approverIds,
  generationReviewRequired,
  quorumMet,
  quorumNeeded,
  resolveApprovalMode,
} from './generationReview';
export type { GenerationSettingsLike } from './generationReview';
export { roleMayWriteProduction } from './directProd';

export {
  GENERATION_PREFERRED_ENV_BLOCKED,
  isStaleEnvUuidError,
  omitEnvUuid,
  omitSandboxEnvKeys,
  callWithEnvUuidRetry,
} from './envUuidRetry';
export type { SandboxEnvUuidRetryOptions } from './envUuidRetry';

export type PromoteStrategy = 'immediate' | 'canary' | 'blue_green';

/** GET /api/sandbox/limits — tier + buffs + usage. */
export type SandboxLimitsPayload = {
  sandbox_environment_count: number;
  sandbox_generation_depth: number;
  sandbox_checkpoint_count: number;
  sandbox_ab_test_count: number;
  sandbox_shadow_writes: boolean;
  sandbox_env_ttl_days: number;
};

export type SandboxLimitsResponse = {
  tier: string;
  limits: SandboxLimitsPayload;
  usage: {
    environment_count: number;
    checkpoint_count: number;
    ab_test_count: number;
  };
  features: {
    canary: boolean;
    shadow_writes: boolean;
    ab_test: boolean;
    canary_auto_route?: boolean;
    canary_auto_route_eligible?: boolean;
  };
};

export type SandboxPlanErrorBody = {
  error: 'sandbox_not_available' | 'sandbox_limit_exceeded' | string;
  message?: string;
  available_from?: string;
  upgrade_url?: string;
  limit_type?: string;
  current?: number;
  max?: number;
};

export class SandboxLimitError extends Error {
  readonly body: SandboxPlanErrorBody;
  readonly status = 403;

  constructor(body: SandboxPlanErrorBody) {
    super(body.message || body.error);
    this.name = 'SandboxLimitError';
    this.body = body;
  }
}

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === 'object' && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : null;
}

/** Map thrown HTTPClient / fetch errors to SandboxLimitError when detail matches. */
export function toSandboxLimitError(error: unknown): SandboxLimitError | null {
  const root = asRecord(error);
  if (!root) return null;
  const detail =
    asRecord(root.details) ||
    asRecord(root.detail) ||
    asRecord(asRecord(root.data)?.detail) ||
    asRecord(asRecord(asRecord(root.response)?.data)?.detail);
  if (!detail) return null;
  const code = String(detail.error || '');
  if (code !== 'sandbox_not_available' && code !== 'sandbox_limit_exceeded') {
    return null;
  }
  return new SandboxLimitError({
    error: code,
    message: typeof detail.message === 'string' ? detail.message : undefined,
    available_from:
      typeof detail.available_from === 'string' ? detail.available_from : undefined,
    upgrade_url: typeof detail.upgrade_url === 'string' ? detail.upgrade_url : '/pricing',
    limit_type: typeof detail.limit_type === 'string' ? detail.limit_type : undefined,
    current: typeof detail.current === 'number' ? detail.current : undefined,
    max: typeof detail.max === 'number' ? detail.max : undefined,
  });
}

export type GenerationSettingsPatch = {
  auto_generation_mode?: boolean;
  auto_checkpoint_before_promote?: boolean;
  require_gates_passed_on_promote?: boolean;
  auto_generation_categories?: string[];
  auto_generation_soak_minutes?: number;
  auto_generation_require_approval?: boolean;
  /** off | at_least_one | min_count | min_percent | manual_only */
  auto_generation_approval_mode?: string;
  auto_generation_approval_min_count?: number;
  auto_generation_approval_min_percent?: number;
  /** Roles that write production. Empty list forces every actor through sandbox. */
  direct_prod_roles?: string[];
  auto_promote_on_all_pass?: boolean;
  auto_promote_strategy?: PromoteStrategy;
  canary_auto_route?: boolean;
  canary_error_rate_threshold?: number;
  canary_p99_latency_ms_threshold?: number;
  canary_watchdog_interval_seconds?: number;
};

export type PreviewEnvScope = {
  /** Environment UUID or name applied for scoped reads. */
  envUuid: string;
  /** Read project.data (or a dot path) while preview env header is set. */
  getProjectData: (
    projectId: number,
    path?: string,
  ) => Promise<unknown>;
  /** Restore the HTTP client sandbox header to its prior value. */
  restore: () => void;
};

export class GenerationsClient {
  constructor(private readonly http: HTTPClient) {}

  async getStatus(projectId: number) {
    const res = await this.http.get(`/generations/${projectId}/status`);
    return res.data;
  }

  async list(projectId: number) {
    const res = await this.http.get(`/generations/${projectId}`);
    return res.data;
  }

  async getQueue(projectId: number) {
    const res = await this.http.get(`/generations/${projectId}/queue`);
    return res.data;
  }

  async getGates(projectId: number, envUuid: string) {
    const res = await this.http.get(`/generations/${projectId}/gates/${envUuid}`);
    return res.data;
  }

  async runGates(projectId: number, body: { env_uuid: string; manual_approved?: boolean }) {
    const res = await this.http.post(`/generations/${projectId}/gates/run`, body);
    return res.data;
  }

  async approve(projectId: number, body: { env_uuid: string; manual_approved?: boolean }) {
    const res = await this.http.post(`/generations/${projectId}/approve`, body);
    return res.data;
  }

  async getSettings(projectId: number) {
    const res = await this.http.get(`/generations/${projectId}/settings`);
    return res.data;
  }

  async patchSettings(projectId: number, patch: GenerationSettingsPatch) {
    const res = await this.http.patch(`/generations/${projectId}/settings`, patch);
    return res.data;
  }

  async getTimeline(projectId: number, limit = 20, offset = 0) {
    const res = await this.http.get(
      `/generations/${projectId}/timeline?limit=${limit}&offset=${offset}`,
    );
    return res.data;
  }

  async notify(projectId: number, body: { env_uuid: string; message?: string }) {
    const res = await this.http.post(`/generations/${projectId}/notify`, body);
    return res.data;
  }

  /**
   * Promote via MCP (tenant supply parity — same params as `generation.promote` tool).
   * Prefer when REST sandbox promote is unavailable in headless clients.
   */
  async promoteMcp(
    projectId: number,
    mcp: {
      execute: (
        steps: Array<{ action: string; params: Record<string, unknown> }>,
      ) => Promise<unknown>;
    },
    body: {
      env_uuid: string;
      strategy?: PromoteStrategy;
      rollout_mode?: 'standard' | 'test';
      segment_id?: string;
      rollout_steps?: Array<{ weight: number; pause_minutes: number; auto_advance: boolean }>;
      require_gates_passed?: boolean;
    },
    options?: {
      applyGatesPolicy?: boolean;
      settings?: GenerationSettingsLike;
    },
  ) {
    let params: Record<string, unknown> = { project_id: projectId, ...body };
    if (options?.applyGatesPolicy !== false) {
      const settings =
        options?.settings ??
        ((await this.getSettings(projectId)) as { settings?: GenerationSettingsLike })?.settings;
      params = applyPromoteGatesPolicy(
        params as { require_gates_passed?: boolean },
        settings ?? null,
      ) as Record<string, unknown>;
      params.project_id = projectId;
    }
    const result = await mcp.execute([
      {
        action: 'generation.promote',
        params,
      },
    ]);
    return result;
  }
}

export class SandboxClient {
  readonly generations: GenerationsClient;

  constructor(private readonly http: HTTPClient) {
    this.generations = new GenerationsClient(http);
  }

  setSandboxEnv(envUuidOrName: string | undefined): void {
    this.http.updateConfig({ sandboxEnv: envUuidOrName });
  }

  /**
   * Bind reads to a sandbox env via X-AgentStack-Env; call restore() when done.
   */
  previewEnv(envUuidOrName: string): PreviewEnvScope {
    const previous = this.http.getConfig().sandboxEnv;
    this.setSandboxEnv(envUuidOrName);
    return {
      envUuid: envUuidOrName,
      getProjectData: async (projectId: number, path?: string) => {
        const query =
          path != null && String(path).length > 0
            ? `?path=${encodeURIComponent(String(path))}`
            : '';
        const res = await this.http.get(`/projects/${projectId}/data${query}`);
        return res.data;
      },
      restore: () => {
        this.setSandboxEnv(previous || undefined);
      },
    };
  }

  async listEnvironments(projectId: number) {
    const res = await this.http.get<{ environments: unknown[] }>(
      `/sandbox/environments?project_id=${projectId}`,
    );
    return res.data;
  }

  async getLimits(projectId: number): Promise<SandboxLimitsResponse> {
    const res = await this.http.get<SandboxLimitsResponse>(
      `/sandbox/limits?project_id=${projectId}`,
    );
    return res.data as SandboxLimitsResponse;
  }

  async fork(
    projectId: number,
    body: { source_project_id: number; env_name: string; env_type?: string },
  ) {
    try {
      const res = await this.http.post(`/sandbox/fork?project_id=${projectId}`, body);
      return res.data;
    } catch (err) {
      const mapped = toSandboxLimitError(err);
      if (mapped) throw mapped;
      throw err;
    }
  }

  async checkpoint(
    projectId: number,
    body: { env_uuid: string; label?: string; table?: string },
  ) {
    const res = await this.http.post(`/sandbox/checkpoint?project_id=${projectId}`, body);
    return res.data;
  }

  async rollback(
    projectId: number,
    body: { checkpoint_uuid: string; env_name?: string },
  ) {
    const res = await this.http.post(`/sandbox/rollback?project_id=${projectId}`, body);
    return res.data;
  }

  async pin(projectId: number, envUuid: string) {
    const res = await this.http.post(`/sandbox/pin?project_id=${projectId}`, {
      env_uuid: envUuid,
    });
    return res.data;
  }

  async getDiff(
    projectId: number,
    uuidA: string,
    uuidB: string,
    table = 'data_projects_8dna',
  ) {
    const params = new URLSearchParams({
      project_id: String(projectId),
      uuid_a: uuidA,
      uuid_b: uuidB,
      table,
    });
    const res = await this.http.get(`/sandbox/diff?${params.toString()}`);
    return res.data;
  }

  async getTree(
    projectId: number,
    rootUuid: string,
    table = 'data_projects_8dna',
  ) {
    const params = new URLSearchParams({
      project_id: String(projectId),
      root_uuid: rootUuid,
      table,
    });
    const res = await this.http.get(`/sandbox/tree?${params.toString()}`);
    return res.data;
  }

  async promote(
    projectId: number,
    body: {
      env_uuid: string;
      strategy?: PromoteStrategy;
      rollout_mode?: 'standard' | 'test';
      segment_id?: string;
      rollout_steps?: Array<{ weight: number; pause_minutes: number; auto_advance: boolean }>;
      require_gates_passed?: boolean;
    },
    options?: {
      /** When true (default), merge require_gates_passed from project settings if omitted. */
      applyGatesPolicy?: boolean;
      settings?: GenerationSettingsLike;
    },
  ) {
    let payload = body;
    if (options?.applyGatesPolicy !== false) {
      const settings =
        options?.settings ??
        ((await this.generations.getSettings(projectId)) as { settings?: GenerationSettingsLike })
          ?.settings;
      payload = applyPromoteGatesPolicy(body, settings ?? null);
    }
    try {
      const res = await this.http.post(`/sandbox/promote?project_id=${projectId}`, payload);
      return res.data;
    } catch (err) {
      const mapped = toSandboxLimitError(err);
      if (mapped) throw mapped;
      throw err;
    }
  }

  async approvePromotion(projectId: number, reqId: string) {
    const res = await this.http.post(
      `/sandbox/promote/${encodeURIComponent(reqId)}/approve?project_id=${projectId}`,
      {},
    );
    return res.data;
  }

  async getStatus(projectId: number) {
    return this.generations.getStatus(projectId);
  }

  async advanceCanary(projectId: number, envUuid: string) {
    const res = await this.http.post(`/sandbox/rollout/advance?project_id=${projectId}`, {
      env_uuid: envUuid,
    });
    return res.data;
  }

  async abortCanary(
    projectId: number,
    envUuid: string,
    opts?: { mark_failed?: boolean },
  ) {
    const res = await this.http.post(`/sandbox/rollout/abort?project_id=${projectId}`, {
      env_uuid: envUuid,
      mark_failed: Boolean(opts?.mark_failed),
    });
    return res.data;
  }

  async promoteHostingRelease(
    projectId: number,
    body: {
      site_id: string;
      env_uuid?: string;
      sandbox_generation?: number;
      label?: string;
      publish_preview?: boolean;
    },
  ) {
    const res = await this.http.post(`/sandbox/hosting/release?project_id=${projectId}`, body);
    return res.data;
  }
}

export function createSandboxClient(http: HTTPClient): SandboxClient {
  return new SandboxClient(http);
}

export function createGenerationsClient(http: HTTPClient): GenerationsClient {
  return new GenerationsClient(http);
}
