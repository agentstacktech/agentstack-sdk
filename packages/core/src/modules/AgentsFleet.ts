/**
 * Agents — REST facade for 8DNA-backed agents (project + personal).
 *
 * - ``/api/projects/{projectId}/agents/*`` — project agents
 * - ``/api/users/me/agents/*`` — personal agents (session ``project_id`` = home)
 *
 * Genetic tag: sdk.agents.gen1
 */

import { HTTPClient } from '../client/http-client';
import type { ProjectDataStringLeafEdit } from '../types/entities/Project';
import type { RequestConfig } from '../types';

type AgentsEnvOpts = { envUuid?: string | null };

function agentsSandboxGetOptions(opts?: AgentsEnvOpts): Partial<RequestConfig> | undefined {
  const env = String(opts?.envUuid ?? '').trim();
  return env ? { headers: { 'X-AgentStack-Env': env } } : undefined;
}

function agentsSandboxPostOptions(
  opts?: AgentsEnvOpts,
  base?: Partial<RequestConfig>,
): Partial<RequestConfig> | undefined {
  const env = String(opts?.envUuid ?? '').trim();
  if (!env) return base;
  const headers = { ...(base?.headers as Record<string, string> | undefined), 'X-AgentStack-Env': env };
  return { ...base, headers };
}
import type { RunErrorV1 } from '../agents/runError';
import { extractBatchMeta } from '../mcp/execute';
import {
  isPersonalGraphHome,
  isSandboxEnvAllowedForGraphHome,
  mcpGraphHomeFields,
  normalizeMcpToolEnvelope,
  parseGraphHomeParam,
  type GraphHomeParam,
} from '../agents/planGraph';

export interface AgentRowDTO {
  uuid: string;
  project_id: number;
  user_id: number;
  generation?: number;
  parent_uuid?: string | null;
  agent_spec?: Record<string, unknown>;
  updated_at?: string | null;
}

/** Live policy preview from ``POST .../agents/policy/preview`` (V2). */
export interface AgentPolicyPreviewDTO {
  effective_actions: string[];
  denied: { action: string; reasons: string }[];
  approval_required: string[];
  rbac_preview?: {
    owner_or_writer_allowed: string[];
    read_only_allowed: string[];
    read_only_denied: string[];
    approval_required: string[];
  };
}

/** Body for ``POST .../agents/policy/preview``. */
export interface AgentPolicyPreviewBody {
  capabilities: string[];
  forbidden_tools?: string[];
  approval_required_actions?: string[];
}

/** Body for ``POST .../agents/templates/preview``. */
export interface AgentTemplatePreviewBody {
  template_id: string;
  name?: string;
  template_input?: Record<string, unknown>;
}

/** Single AgentSpec patch for ``forProject(...).updateSpecPatch(...)``. */
export type AgentSpecPatchDTO = Record<string, unknown>;

/** Run event payload (UI consumers; mirrors ``shared/atoms/agent_schema.py`` runtime events). */
export interface AgentRunEventDTO {
  ts: string;
  kind: string;
  stage?: string;
  hlc?: number;
  seq?: number;
  data?: Record<string, unknown>;
}

export type AgentRunStatusDTO =
  | 'queued'
  | 'running'
  | 'waiting_for_approval'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface AgentPendingToolCallDTO {
  action?: string;
  tool?: string;
  params?: Record<string, unknown>;
  args?: Record<string, unknown>;
  reason?: string;
}

export interface AgentApprovalReviewDTO {
  reviewer_user_id?: number;
  reviewer_note?: string;
  reviewed_params?: Record<string, unknown> | null;
  approval_artifact_hash?: string;
  approval_review_hash?: string;
  reviewed_at?: string;
}

export interface AgentRunSpecDTO {
  run_id: string;
  agent_id: string;
  project_id: number;
  user_id: number;
  input?: Record<string, unknown>;
  parent_run_id?: string | null;
  root_run_id?: string | null;
  handoff_to_agent_id?: string | null;
  handoff_reason?: string | null;
  status: AgentRunStatusDTO;
  output?: Record<string, unknown>;
  events?: AgentRunEventDTO[];
  error?: string | null;
  started_at?: string | null;
  finished_at?: string | null;
  pending_tool_call?: AgentPendingToolCallDTO | null;
  approval_granted?: boolean;
  approval_review?: AgentApprovalReviewDTO | null;
}

export interface AgentRunRowDTO {
  uuid: string;
  project_id: number;
  agent_run_spec?: AgentRunSpecDTO;
}

export interface AgentRunDetailDTO {
  run_id: string;
  agent_id: string;
  project_id: number;
  status: AgentRunStatusDTO;
  stage?: string | null;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  error?: string | null;
  /** Parity with MCP resume + ``shared.atoms.run_error.RunErrorV1``. */
  error_detail?: RunErrorV1 | null;
  started_at?: string | null;
  finished_at?: string | null;
  hlc?: number | null;
  parent_run_id?: string | null;
  root_run_id?: string | null;
  handoff_to_agent_id?: string | null;
  handoff_reason?: string | null;
  pending_approval?: AgentPendingToolCallDTO | null;
  approval_review?: AgentApprovalReviewDTO | null;
  approval_artifact_hash?: string | null;
  approval_requested_at?: string | null;
  approval_expires_at?: string | null;
  timeline: AgentRunEventDTO[];
  summary: {
    event_count: number;
    has_output: boolean;
    has_error: boolean;
    waiting_for_approval: boolean;
  };
}

export interface AgentPendingApprovalDTO {
  agent_id: string;
  agent_name?: string | null;
  run_id: string;
  approval_artifact_hash?: string | null;
  approval_requested_at?: string | null;
  approval_expires_at?: string | null;
  stale: boolean;
  pending_approval?: AgentPendingToolCallDTO | null;
  run_detail?: AgentRunDetailDTO;
}

export interface AgentPendingApprovalListOptions {
  limit?: number;
  stale_only?: boolean;
  staleOnly?: boolean;
}

export interface AgentRunListFilters {
  status?: AgentRunStatusDTO;
  since?: string;
  with_agc_purchase?: boolean;
  limit?: number;
}

export interface AgentStartRunOptions {
  input?: Record<string, unknown>;
  idempotency_key?: string;
  idempotencyKey?: string;
  wait?: boolean;
  wait_timeout_s?: number;
  waitTimeoutS?: number;
  parent_run_id?: string;
  parentRunId?: string;
  root_run_id?: string;
  rootRunId?: string;
  handoff_to_agent_id?: string;
  handoffToAgentId?: string;
  handoff_reason?: string;
  handoffReason?: string;
  envUuid?: string | null;
}

export interface AgentApproveRunOptions {
  reviewed_params?: Record<string, unknown>;
  reviewer_note?: string;
  approval_artifact_hash?: string;
  reviewedParams?: Record<string, unknown>;
  reviewerNote?: string;
  approvalArtifactHash?: string;
  envUuid?: string | null;
}

export interface AgentStopRunOptions {
  reason?: string;
  reviewer_note?: string;
  reviewerNote?: string;
  envUuid?: string | null;
}

export interface AgentRunTracesDTO {
  success?: boolean;
  run_uuid?: string;
  status?: AgentRunStatusDTO;
  events?: AgentRunEventDTO[];
  traces?: unknown[];
  [key: string]: unknown;
}

export interface AgentRunStreamFrameDTO {
  events?: AgentRunEventDTO[];
  terminal?: AgentRunStatusDTO | string;
  heartbeat?: boolean;
  waiting_approval?: boolean;
  [key: string]: unknown;
}

export async function* parseAgentRunSSE(
  source: Response | ReadableStream<Uint8Array>,
): AsyncGenerator<AgentRunEventDTO, void, unknown> {
  async function* parseFrame(frame: string): AsyncGenerator<AgentRunEventDTO, void, unknown> {
    const dataLine = frame
      .split('\n')
      .find((line) => line.startsWith('data:'));
    if (!dataLine) return;
    const raw = dataLine.slice(5).trim();
    if (!raw || raw === '[DONE]') return;
    try {
      const parsed = JSON.parse(raw) as AgentRunEventDTO | AgentRunStreamFrameDTO;
      if ('events' in parsed && Array.isArray(parsed.events)) {
        for (const event of parsed.events) yield event;
        if (parsed.terminal) {
          yield {
            ts: new Date().toISOString(),
            kind: 'terminal',
            data: { status: parsed.terminal },
          };
        }
      } else {
        yield parsed as AgentRunEventDTO;
      }
    } catch {
      yield { ts: new Date().toISOString(), kind: 'raw', data: { raw } };
    }
  }

  const stream = (
    typeof Response !== 'undefined' && source instanceof Response ? source.body : source
  ) as ReadableStream<Uint8Array> | null;
  if (!stream) return;
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const frames = buffer.split('\n\n');
    buffer = frames.pop() ?? '';
    for (const frame of frames) {
      yield* parseFrame(frame);
    }
  }
  if (buffer.trim()) {
    yield* parseFrame(buffer);
  }
}

/** FAP template entry (``GET /api/agents/fap-templates``). */
export interface FapTemplateDTO {
  id: string;
  title: string;
  default_access?: string;
}

/** Built-in catalog entry (``GET .../agents/templates``). */
export interface AgentTemplateDTO {
  id: string;
  template_version?: number;
  title: string;
  description: string;
  category?: string;
  role?: string;
  goal?: string;
  backstory?: string;
  spec_patch?: Record<string, unknown>;
  input_schema?: Record<string, unknown>;
  preview?: Record<string, unknown>;
  recommended_bindings?: Record<string, unknown>;
  quick_actions?: Array<Record<string, unknown>>;
  required_resources?: Array<Record<string, unknown>>;
  recommended_tools?: string[];
  example_inputs?: Record<string, unknown>[];
  activation_checklist?: string[];
  output_schema?: Record<string, unknown>;
  requires_approval_for?: string[];
  approval_mode?: 'never' | 'dangerous_tools' | 'all_writes';
  tags?: string[];
}

/** ``GET .../agents/fleet/diagnostics`` (AO7 project RBAC). */
export interface AgentFleetDiagnosticsDTO {
  success: boolean;
  project_id: number;
  agents_total: number;
  killswitch: boolean;
  run_status_counts: Record<string, number>;
  stuck_running_15m: number;
  approval_wait_count: number;
  approval_wait_avg_s: number;
  worker_health: {
    queue?: string;
    status?: string;
    queue_depth?: number;
    queue_counts?: Record<string, number>;
  };
}

export interface AgentFleetSweepStaleRunsOptions {
  agent_uuid?: string;
  limit?: number;
}

export interface AgentFleetReconcileRunResultDTO {
  success: boolean;
  project_id: number;
  run_uuid: string;
  action: string;
  reason: string;
  repaired: boolean;
}

/**
 * Deep merge for AgentSpec patches — mirrors
 * ``agentstack-frontend/src/lib/agents/mergeAgentSpec.ts``.
 */
function mergeAgentSpec(
  base: Record<string, unknown>,
  patch: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...base };
  for (const [k, v] of Object.entries(patch)) {
    if (
      v &&
      typeof v === 'object' &&
      !Array.isArray(v) &&
      out[k] &&
      typeof out[k] === 'object' &&
      !Array.isArray(out[k])
    ) {
      out[k] = mergeAgentSpec(out[k] as Record<string, unknown>, v as Record<string, unknown>);
    } else {
      out[k] = v;
    }
  }
  return out;
}

export class AgentsFleet {
  constructor(private readonly client: HTTPClient) {}

  private base(projectId: number): string {
    return `/projects/${projectId}/agents`;
  }

  // ---------------------------------------------------------------------
  // Global catalog endpoints (UI v2 — Phase A)
  // ---------------------------------------------------------------------

  async listLlmProviders(): Promise<{ providers: string[] }> {
    const res = await this.client.get('/agents/llm-providers');
    return res.data as { providers: string[] };
  }

  async listFapTemplates(): Promise<{ templates: FapTemplateDTO[] }> {
    const res = await this.client.get('/agents/fap-templates');
    return res.data as { templates: FapTemplateDTO[] };
  }

  // ---------------------------------------------------------------------
  // Policy / template previews (UI v2 — Phase A1 / A4)
  // ---------------------------------------------------------------------

  async previewPolicy(projectId: number, body: AgentPolicyPreviewBody): Promise<AgentPolicyPreviewDTO> {
    const res = await this.client.post(`${this.base(projectId)}/policy/preview`, {
      capabilities: body.capabilities,
      forbidden_tools: body.forbidden_tools ?? [],
      approval_required_actions: body.approval_required_actions ?? [],
    });
    return res.data as AgentPolicyPreviewDTO;
  }

  async previewPolicyMine(body: AgentPolicyPreviewBody): Promise<AgentPolicyPreviewDTO> {
    const res = await this.client.post('/users/me/agents/policy/preview', {
      capabilities: body.capabilities,
      forbidden_tools: body.forbidden_tools ?? [],
      approval_required_actions: body.approval_required_actions ?? [],
    });
    return res.data as AgentPolicyPreviewDTO;
  }

  async previewTemplate(
    projectId: number,
    body: AgentTemplatePreviewBody,
  ): Promise<{ agent_spec: Record<string, unknown> }> {
    const res = await this.client.post(`${this.base(projectId)}/templates/preview`, body);
    return res.data as { agent_spec: Record<string, unknown> };
  }

  async previewTemplateMine(
    body: AgentTemplatePreviewBody,
  ): Promise<{ agent_spec: Record<string, unknown> }> {
    const res = await this.client.post('/users/me/agents/templates/preview', body);
    return res.data as { agent_spec: Record<string, unknown> };
  }

  /**
   * Section-scoped patch helper — fetches the current ``agent_spec``,
   * deep-merges ``patch`` and persists with one ``update`` call.
   *
   * Mirrors the frontend ``mergeAgentSpec(current, patch)`` flow used by
   * ``AgentSpecSectionEditor`` so SDK consumers (CLI, automation, tests)
   * never need to ship their own merge logic.
   */
  async updateSpecPatch(
    projectId: number,
    agentId: string,
    patch: AgentSpecPatchDTO,
  ): Promise<{ success: boolean; agent: AgentRowDTO }> {
    const current = await this.get(projectId, agentId);
    const next = mergeAgentSpec(current.agent.agent_spec ?? {}, patch);
    return this.update(projectId, agentId, next);
  }

  async updateSpecPatchMine(
    agentId: string,
    patch: AgentSpecPatchDTO,
  ): Promise<{ success: boolean; agent: AgentRowDTO }> {
    const current = await this.getMine(agentId);
    const next = mergeAgentSpec(current.agent.agent_spec ?? {}, patch);
    return this.updateMine(agentId, next);
  }

  async list(
    projectId: number,
    options?: AgentsEnvOpts,
  ): Promise<{ success: boolean; agents: AgentRowDTO[] }> {
    const res = await this.client.get(
      this.base(projectId),
      undefined,
      agentsSandboxGetOptions(options),
    );
    return res.data as { success: boolean; agents: AgentRowDTO[] };
  }

  async get(
    projectId: number,
    agentId: string,
    options?: AgentsEnvOpts,
  ): Promise<{ success: boolean; agent: AgentRowDTO }> {
    const res = await this.client.get(
      `${this.base(projectId)}/${agentId}`,
      undefined,
      agentsSandboxGetOptions(options),
    );
    return res.data as { success: boolean; agent: AgentRowDTO };
  }

  async create(projectId: number, name?: string): Promise<{ success: boolean; agent: AgentRowDTO }> {
    const res = await this.client.post(this.base(projectId), { name: name || 'Agent' });
    return res.data as { success: boolean; agent: AgentRowDTO };
  }

  async listTemplates(projectId: number): Promise<{ success: boolean; templates: AgentTemplateDTO[] }> {
    const res = await this.client.get(`${this.base(projectId)}/templates`);
    return res.data as { success: boolean; templates: AgentTemplateDTO[] };
  }

  async automationMap(
    projectId: number,
    options?: AgentsEnvOpts,
  ): Promise<{ success: boolean; agents: unknown[]; total: number }> {
    const res = await this.client.get(
      `${this.base(projectId)}/automation-map`,
      undefined,
      agentsSandboxGetOptions(options),
    );
    return res.data as { success: boolean; agents: unknown[]; total: number };
  }

  /** REST fleet diagnostics (project scope). For plan-home + sandbox env use {@link fleetDiagnosticsMcp}. */
  async fleetDiagnostics(
    projectId: number,
    options?: AgentsEnvOpts,
  ): Promise<AgentFleetDiagnosticsDTO> {
    const res = await this.client.get(
      `${this.base(projectId)}/fleet/diagnostics`,
      undefined,
      agentsSandboxGetOptions(options),
    );
    return res.data as AgentFleetDiagnosticsDTO;
  }

  /**
   * MCP ``agents.fleet_diagnostics`` — binding triage, optional service health, ``next_action`` hints.
   * Honors ``home`` and strips ``env_uuid`` on personal graph (parity with ``workNext``).
   */
  async fleetDiagnosticsMcp(
    projectId: number,
    body?: {
      include_health_snapshot?: boolean;
      env_uuid?: string;
      home?: 'project' | 'self' | 'project_self';
      locale?: string;
    },
  ): Promise<Record<string, unknown>> {
    const { locale, ...params } = body ?? {};
    return this.mcpAgentsAction(projectId, 'agents.fleet_diagnostics', params, { locale });
  }

  async reconcileRun(projectId: number, runUuid: string): Promise<AgentFleetReconcileRunResultDTO> {
    const res = await this.client.post(`${this.base(projectId)}/runs/${runUuid}/reconcile`);
    return res.data as AgentFleetReconcileRunResultDTO;
  }

  async sweepStaleRuns(
    projectId: number,
    options: AgentFleetSweepStaleRunsOptions = {},
  ): Promise<{ success: boolean; project_id: number; scope: string; touched: number; limit: number }> {
    const res = await this.client.post(`${this.base(projectId)}/fleet/sweep-stale-runs`, {
      agent_uuid: options.agent_uuid,
      limit: options.limit,
    });
    return res.data as {
      success: boolean;
      project_id: number;
      scope: string;
      touched: number;
      limit: number;
    };
  }

  async exportPack(
    projectId: number,
    agentId: string,
  ): Promise<{ success: boolean; agent_spec: Record<string, unknown>; pack_version: number }> {
    const res = await this.client.get(`${this.base(projectId)}/${agentId}/export-pack`);
    return res.data;
  }

  /**
   * Import one fleet agent from catalog spec (REST ``POST …/agents/import-pack``).
   * Orchestrator marketplace packs: use {@link importOrchestratorPack} on ``home=project`` only.
   */
  async importPack(
    projectId: number,
    body: {
      agent_spec: Record<string, unknown>;
      template_id?: string;
      name?: string;
      fork_on_collision?: boolean;
      env_uuid?: string;
    },
  ): Promise<{ success: boolean; agent: AgentRowDTO }> {
    const res = await this.client.post(`${this.base(projectId)}/import-pack`, body);
    return res.data as { success: boolean; agent: AgentRowDTO };
  }

  async importFromAsset(
    projectId: number,
    body: { asset: Record<string, unknown>; name?: string; env_uuid?: string },
  ): Promise<{ success: boolean; agent: AgentRowDTO; missing_resources?: string[] }> {
    const res = await this.client.post(`${this.base(projectId)}/import-from-asset`, body);
    return res.data as { success: boolean; agent: AgentRowDTO; missing_resources?: string[] };
  }

  async compileWorkflow(
    projectId: number,
    workflow: Record<string, unknown>,
  ): Promise<{ success: boolean; compiled: Record<string, unknown> }> {
    const res = await this.client.post(`${this.base(projectId)}/workflow/compile-preview`, {
      workflow,
    });
    return res.data as { success: boolean; compiled: Record<string, unknown> };
  }

  async createFromTemplate(
    projectId: number,
    body: {
      template_id: string;
      name?: string;
      description?: string;
      template_input?: Record<string, unknown>;
      node_id?: string;
      env_uuid?: string;
      home?: 'project' | 'self' | 'project_self';
    },
  ): Promise<{ success: boolean; agent: AgentRowDTO; bound_node_id?: string }> {
    const graphHome = this.graphHomeParam(body.home);
    const scope = this.orchestratorScopeParams(graphHome, body.env_uuid);
    const res = await this.client.post(`${this.base(projectId)}/from-template`, {
      template_id: body.template_id,
      name: body.name ?? 'Agent',
      description: body.description ?? '',
      template_input: body.template_input ?? {},
      ...(body.node_id ? { node_id: body.node_id } : {}),
      ...scope,
    });
    return res.data as { success: boolean; agent: AgentRowDTO; bound_node_id?: string };
  }

  async approveRun(
    projectId: number,
    agentId: string,
    runId: string,
    options: AgentApproveRunOptions = {},
  ): Promise<{ success: boolean; run_uuid?: string; work_item_id?: string }> {
    const res = await this.client.post(
      `${this.base(projectId)}/${agentId}/runs/${runId}/approve`,
      {
        reviewed_params: options.reviewed_params ?? options.reviewedParams,
        reviewer_note: options.reviewer_note ?? options.reviewerNote,
        approval_artifact_hash: options.approval_artifact_hash ?? options.approvalArtifactHash,
      },
      agentsSandboxPostOptions({ envUuid: options.envUuid }),
    );
    return res.data;
  }

  async update(
    projectId: number,
    agentId: string,
    agentSpec: Record<string, unknown>,
  ): Promise<{ success: boolean; agent: AgentRowDTO }> {
    const res = await this.client.put(`${this.base(projectId)}/${agentId}`, { agent_spec: agentSpec });
    return res.data as { success: boolean; agent: AgentRowDTO };
  }

  /** Leaf merge on agent_spec (search_replace via path_updates value envelopes). */
  async patch(
    projectId: number,
    agentId: string,
    body: {
      path_updates?: Record<string, unknown | ProjectDataStringLeafEdit>;
      section?: string;
      section_value?: unknown;
      write_mode?: 'patch' | 'merge' | 'replace' | 'write';
    },
  ): Promise<{ success: boolean; agent: AgentRowDTO }> {
    const res = await this.client.patch(`${this.base(projectId)}/${agentId}`, body);
    return res.data as { success: boolean; agent: AgentRowDTO };
  }

  async delete(projectId: number, agentId: string): Promise<{ success: boolean }> {
    const res = await this.client.delete(`${this.base(projectId)}/${agentId}`);
    return res.data as { success: boolean };
  }

  private orchestratorBase(projectId: number): string {
    return `/api/projects/${projectId}/orchestrator`;
  }

  private graphHomeParam(home?: GraphHomeParam | string): 'project' | 'project_self' {
    return parseGraphHomeParam(home);
  }

  /** Query params for orchestrator GET/PATCH — canonical ``project_self``, no env on personal. */
  private orchestratorScopeParams(
    home?: GraphHomeParam | string,
    envUuid?: string | null,
  ): Record<string, string> {
    const params: Record<string, string> = {};
    const graphHome = this.graphHomeParam(home);
    if (graphHome !== 'project') params.home = graphHome;
    const env = String(envUuid ?? '').trim();
    if (env && isSandboxEnvAllowedForGraphHome(graphHome)) {
      params.env_uuid = env;
    }
    return params;
  }

  async getOrchestrator(
    projectId: number,
    options?: {
      include_analytics?: boolean;
      include_execution_eligibility?: boolean;
      compact?: boolean;
      env_uuid?: string;
      home?: 'project' | 'self' | 'project_self';
      include_counters?: boolean;
      node_id?: string;
      page_id?: string;
      max_depth?: number;
      hops?: number;
      view?: string;
      detail?: 'cards' | 'body' | 'full';
      parent_id?: string;
      q?: string;
      tag?: string;
      due_before?: string;
      cursor?: string;
      limit?: number;
      include_edges?: boolean;
      status?: string | string[];
    },
  ): Promise<{
    success: boolean;
    orchestrator?: Record<string, unknown>;
    task_list?: { tasks?: Array<Record<string, unknown>> };
    plan_claim?: Record<string, unknown>;
    plan_focus?: Record<string, unknown>;
    plan_analytics?: Record<string, unknown>;
    plan_metrics?: Record<string, unknown>;
    metrics?: Record<string, unknown>;
    shape?: Record<string, unknown>;
    content_hash?: string;
    execution_eligibility?: Record<string, unknown>;
    focus_path?: string[];
    effective_persona?: string;
    competence_tier?: string;
  }> {
    const params: Record<string, string> = {
      ...this.orchestratorScopeParams(options?.home, options?.env_uuid),
    };
    if (options?.include_analytics === true) params.include_analytics = 'true';
    if (options?.include_execution_eligibility === true) {
      params.include_execution_eligibility = 'true';
    }
    if (options?.compact === true) params.compact = 'true';
    if (options?.include_counters === true) params.include_counters = 'true';
    if (options?.node_id) params.node_id = String(options.node_id);
    if (options?.page_id) params.page_id = String(options.page_id);
    if (typeof options?.max_depth === 'number') params.max_depth = String(options.max_depth);
    if (typeof options?.hops === 'number') params.hops = String(options.hops);
    if (options?.view) params.view = String(options.view);
    if (options?.detail) params.detail = String(options.detail);
    if (options?.parent_id) params.parent_id = String(options.parent_id);
    if (options?.q) params.q = String(options.q);
    if (options?.tag) params.tag = String(options.tag);
    if (options?.due_before) params.due_before = String(options.due_before);
    if (options?.cursor) params.cursor = String(options.cursor);
    if (typeof options?.limit === 'number') params.limit = String(options.limit);
    if (options?.include_edges === false) params.include_edges = 'false';
    const status = options?.status;
    const statusList = status
      ? (Array.isArray(status) ? status : [status]).map((s) => String(s).trim()).filter(Boolean)
      : [];
    const res = await this.client.get(this.orchestratorBase(projectId), {
      params: Object.keys(params).length || statusList.length ? { ...params, ...(statusList.length ? { status: statusList } : {}) } : undefined,
    });
    return res.data as {
      success: boolean;
      orchestrator?: Record<string, unknown>;
      task_list?: { tasks?: Array<Record<string, unknown>> };
      plan_claim?: Record<string, unknown>;
      plan_focus?: Record<string, unknown>;
      plan_analytics?: Record<string, unknown>;
      plan_metrics?: Record<string, unknown>;
      execution_eligibility?: Record<string, unknown>;
      focus_path?: string[];
      effective_persona?: string;
      competence_tier?: string;
    };
  }

  /** Alias for orchestrator GET — same slice surface as ``getOrchestrator``. */
  async planGet(
    projectId: number,
    options?: Parameters<AgentsFleet['getOrchestrator']>[1],
  ): Promise<Awaited<ReturnType<AgentsFleet['getOrchestrator']>>> {
    return this.getOrchestrator(projectId, options);
  }

  async getOrchestratorThread(
    projectId: number,
    optionsOrLimit:
      | number
      | {
          conversationId?: string;
          limit?: number;
          beforeIndex?: number;
          envUuid?: string;
        } = 40,
  ): Promise<{
    success: boolean;
    turns?: Array<{ role: string; text: string; index?: number }>;
    has_more?: boolean;
  }> {
    const options =
      typeof optionsOrLimit === 'number' ? { limit: optionsOrLimit } : optionsOrLimit;
    const params: Record<string, string | number> = { limit: options.limit ?? 40 };
    const conversationId = options.conversationId?.trim();
    if (conversationId) params.conversation_id = conversationId;
    if (options.beforeIndex != null && options.beforeIndex >= 0) {
      params.before_index = options.beforeIndex;
    }
    const envUuid = String(
      ('envUuid' in options ? options.envUuid : '') ?? '',
    ).trim();
    if (envUuid) params.env_uuid = envUuid;
    const res = await this.client.get(`${this.orchestratorBase(projectId)}/thread`, {
      params,
    });
    return res.data as {
      success: boolean;
      turns?: Array<{ role: string; text: string; index?: number }>;
      has_more?: boolean;
    };
  }

  async patchOrchestrator(
    projectId: number,
    patch: Record<string, unknown>,
    envUuid?: string,
    home?: 'project' | 'self' | 'project_self',
  ): Promise<{ success: boolean; orchestrator?: Record<string, unknown> }> {
    const scope = this.orchestratorScopeParams(home, envUuid);
    const res = await this.client.patch(this.orchestratorBase(projectId), {
      patch,
      ...scope,
    });
    return res.data as { success: boolean; orchestrator?: Record<string, unknown> };
  }

  async refreshPlanAffinities(
    projectId: number,
    body?: {
      node_id?: string;
      pin_skills?: boolean;
      pin_genes?: boolean;
      home?: 'project' | 'self' | 'project_self';
      env_uuid?: string;
    },
  ): Promise<{ success: boolean; task_list?: Record<string, unknown> }> {
    const payload = this.scrubPersonalHomeEnv({
      ...(body ?? {}),
      ...mcpGraphHomeFields(body?.home),
    });
    const res = await this.client.post(
      `${this.orchestratorBase(projectId)}/plan/refresh-affinities`,
      payload,
    );
    return res.data as { success: boolean; task_list?: Record<string, unknown> };
  }

  async refreshAgentPlanAffinities(
    projectId: number,
    agentId: string,
    body?: {
      node_id?: string;
      pin_skills?: boolean;
      pin_genes?: boolean;
      env_uuid?: string;
    },
  ): Promise<{ success: boolean; task_list?: Record<string, unknown> }> {
    const res = await this.client.post(
      `${this.orchestratorBase(projectId)}/plan/agent/${encodeURIComponent(agentId)}/refresh-affinities`,
      body ?? {},
    );
    return res.data as { success: boolean; task_list?: Record<string, unknown> };
  }

  async suggestPlanDraft(
    projectId: number,
    body: {
      title: string;
      parent_prompt?: string;
      max_children?: number;
      use_llm?: boolean;
      env_uuid?: string;
      home?: 'project' | 'self' | 'project_self';
    },
  ): Promise<{
    success: boolean;
    draft_children?: Array<Record<string, string>>;
    source?: string;
    intent_id?: string;
    heavy_llm?: boolean;
    llm_skipped?: string;
  }> {
    const payload = this.scrubPersonalHomeEnv({
      ...body,
      ...mcpGraphHomeFields(body.home),
    });
    const res = await this.client.post(
      `${this.orchestratorBase(projectId)}/plan/suggest-draft`,
      payload,
    );
    return res.data as {
      success: boolean;
      draft_children?: Array<Record<string, string>>;
      source?: string;
      intent_id?: string;
    };
  }

  /** Nested plan tree draft — mirrors ``agents.plan_suggest_tree`` (read-only). */
  async suggestPlanTreeDraft(
    projectId: number,
    body: {
      goal_text: string;
      max_depth?: number;
      max_nodes?: number;
      use_llm?: boolean;
      env_uuid?: string;
      home?: 'project' | 'self' | 'project_self';
    },
  ): Promise<{
    success: boolean;
    draft_tree?: {
      version?: number;
      root_prompt?: string;
      tasks?: Array<Record<string, unknown>>;
    };
    source?: string;
    heavy_llm?: boolean;
    llm_skipped?: string;
    validation?: { ok?: boolean; errors?: string[]; node_count?: number; depth?: number };
  }> {
    const payload = this.scrubPersonalHomeEnv({
      ...body,
      ...mcpGraphHomeFields(body.home),
    });
    const res = await this.client.post(
      `${this.orchestratorBase(projectId)}/plan/suggest-tree-draft`,
      payload,
    );
    return res.data as {
      success: boolean;
      draft_tree?: {
        version?: number;
        root_prompt?: string;
        tasks?: Array<Record<string, unknown>>;
      };
      source?: string;
      heavy_llm?: boolean;
      llm_skipped?: string;
      validation?: { ok?: boolean; errors?: string[]; node_count?: number; depth?: number };
    };
  }

  async claimPlanNodes(
    projectId: number,
    body: {
      agent_id: string;
      limit?: number;
      node_ids?: string[];
      /** CAS from plan_get / work_next next_action.params (REST PlanClaimBody). */
      if_match_revision?: number;
      /** Sandbox generation anchor — same slice as plan_get. */
      env_uuid?: string;
      /** Personal homes claim the session row through MCP, not the project REST claim. */
      home?: 'project' | 'self' | 'project_self';
      locale?: string;
      heartbeat_only?: boolean;
      node_id?: string;
      pin_skill_id?: string;
      unpin_skill_id?: string;
      collapse_skill_id?: string;
      expand_skill_id?: string;
      slot_mode?: string;
    },
  ): Promise<{
    success: boolean;
    claimed?: string[];
    task_list?: Record<string, unknown>;
    wip_full?: boolean;
  }> {
    const pinWrite = Boolean(
      body.heartbeat_only ||
        body.pin_skill_id ||
        body.unpin_skill_id ||
        body.collapse_skill_id ||
        body.expand_skill_id,
    );
    if (pinWrite || isPersonalGraphHome(body.home)) {
      const { params, locale } = this.splitFleetLocale(body);
      const { env_uuid: _sandbox, ...personal } = params as typeof body;
      const mcpBody = isPersonalGraphHome(body.home) ? personal : params;
      return this.mcpAgentsAction(projectId, 'agents.plan_claim', mcpBody, {
        locale,
      }) as Promise<{
        success: boolean;
        claimed?: string[];
        task_list?: Record<string, unknown>;
        wip_full?: boolean;
      }>;
    }
    const res = await this.client.post(`${this.orchestratorBase(projectId)}/plan/claim`, body);
    return res.data as {
      success: boolean;
      claimed?: string[];
      task_list?: Record<string, unknown>;
      wip_full?: boolean;
    };
  }

  /** Thin REST wrapper for ``agents.plan_reclaim_stale`` (expired claim leases). */
  async reclaimStalePlanClaims(
    projectId: number,
    body?: {
      env_uuid?: string;
      home?: 'project' | 'self' | 'project_self';
      node_ids?: string[];
    },
  ): Promise<{
    success: boolean;
    reclaimed?: string[];
    task_list?: Record<string, unknown>;
  }> {
    const nodeIds = Array.isArray(body?.node_ids)
      ? body!.node_ids.map((id) => String(id).trim()).filter(Boolean)
      : [];
    if ((body?.home && isPersonalGraphHome(body.home)) || nodeIds.length > 0) {
      return this.mcpAgentsAction(projectId, 'agents.plan_reclaim_stale', {
        ...(nodeIds.length ? { node_ids: nodeIds } : {}),
        ...(body?.home && isPersonalGraphHome(body.home)
          ? mcpGraphHomeFields(body.home)
          : {}),
        ...(body?.env_uuid ? { env_uuid: String(body.env_uuid).trim() } : {}),
      }) as Promise<{
        success: boolean;
        reclaimed?: string[];
        task_list?: Record<string, unknown>;
      }>;
    }
    const env = String(body?.env_uuid ?? '').trim();
    const res = await this.client.post(
      `${this.orchestratorBase(projectId)}/plan/reclaim-stale`,
      {},
      env ? { params: { env_uuid: env } } : undefined,
    );
    return res.data as {
      success: boolean;
      reclaimed?: string[];
      task_list?: Record<string, unknown>;
    };
  }

  /** Build planner proposal (draft) — mirrors ``agents.plan_propose``. */
  async planPropose(
    projectId: number,
    body?: import('../agents/planGraph').PlanProposeRequestBody,
  ): Promise<import('../agents/planGraph').PlanProposeResult> {
    if (body?.home && isPersonalGraphHome(body.home)) {
      const { env_uuid: _drop, ...personal } = body;
      return this.planProposeMcp(projectId, {
        ...personal,
        ...mcpGraphHomeFields(body.home as GraphHomeParam),
      });
    }
    const res = await this.client.post(
      `${this.orchestratorBase(projectId)}/plan/propose`,
      body ?? {},
    );
    return res.data as import('../agents/planGraph').PlanProposeResult;
  }

  /** Persist planner proposal with CAS — mirrors ``agents.plan_apply_proposal``. */
  async planApplyProposal(
    projectId: number,
    body: {
      proposal: import('../agents/planGraph').PlannerProposal | Record<string, unknown>;
      if_match_revision?: number;
      env_uuid?: string;
      validation_mode?: 'strict' | 'persist_unexecutable';
      home?: 'project' | 'self' | 'project_self';
    },
  ): Promise<import('../agents/planGraph').PlanApplyProposalResult> {
    if (isPersonalGraphHome(body.home)) {
      const { env_uuid: _drop, ...personal } = body;
      return this.planApplyProposalMcp(projectId, {
        ...personal,
        ...mcpGraphHomeFields(body.home),
      });
    }
    const res = await this.client.post(
      `${this.orchestratorBase(projectId)}/plan/apply-proposal`,
      body,
    );
    return res.data as import('../agents/planGraph').PlanApplyProposalResult;
  }

  /** Build planner proposal for an agent-scoped plan graph. */
  async planProposeAgent(
    projectId: number,
    agentId: string,
    body?: import('../agents/planGraph').PlanProposeRequestBody,
  ): Promise<import('../agents/planGraph').PlanProposeResult> {
    const res = await this.client.post(
      `${this.orchestratorBase(projectId)}/plan/agent/${encodeURIComponent(agentId)}/propose`,
      body ?? {},
    );
    return res.data as import('../agents/planGraph').PlanProposeResult;
  }

  /** Persist planner proposal to an agent-scoped plan graph with CAS. */
  async planApplyProposalAgent(
    projectId: number,
    agentId: string,
    body: {
      proposal: import('../agents/planGraph').PlannerProposal | Record<string, unknown>;
      if_match_revision?: number;
      env_uuid?: string;
    },
  ): Promise<import('../agents/planGraph').PlanApplyProposalResult> {
    const res = await this.client.post(
      `${this.orchestratorBase(projectId)}/plan/agent/${encodeURIComponent(agentId)}/apply-proposal`,
      body,
    );
    return res.data as import('../agents/planGraph').PlanApplyProposalResult;
  }

  /**
   * ``agents.work_next`` next-work packet. Project home uses REST GET (read) or POST (claim);
   * personal home or unmatched cases use MCP.
   * Thread the same ``env_uuid`` across plan_get, plan_propose, plan_apply_proposal,
   * plan_process_backlog, plan_recovery_scan, and work_next on sandbox forks
   * (atom ``WG_ENV_UUID_PARITY``).
   */
  async workNext(
    projectId: number,
    body?: {
      goal_id?: string;
      agent_id?: string;
      claim?: boolean;
      prefer_agent_id?: string;
      handoff?: boolean;
      node_id?: string;
      focus_node_id?: string;
      env_uuid?: string;
      locale?: string;
      /** ``compact`` (default) for loop tokens; ``full`` for operator UI panels. */
      detail?: 'compact' | 'full';
      /** Panel ids or ``skill:<id>`` to inline on this read. Omit for the compact packet. */
      expand?: string | string[];
      home?: 'project' | 'self' | 'project_self';
      /** Pages ``blocked_work`` when ``detail=full`` (REST GET query / POST body). */
      blocked_cursor?: string;
      blocked_limit?: number;
      /** Workflow ingress correlation (REST POST / MCP). */
      workflow_run_id?: string;
      observed?: Record<string, unknown>;
      /** Attach sandbox generation_pending summary (promote/diff ladder). */
      include_generation_pending?: boolean;
    },
  ): Promise<import('../agents/planGraph').WorkNextPacket> {
    const { locale, ...params } = body ?? {};
    const { parseWorkNextPacket } = await import('../agents/planGraph');
    const home = this.graphHomeParam(String(params.home ?? ''));
    const claim = params.claim === true;
    const scope = this.orchestratorScopeParams(params.home, params.env_uuid);
    const restHome = home === 'project' || home === 'project_self';
    const hasIngress =
      Boolean(String(params.workflow_run_id ?? '').trim()) ||
      (params.observed &&
        typeof params.observed === 'object' &&
        Object.keys(params.observed).length > 0);
    if (restHome && !claim && !hasIngress) {
      const query: Record<string, string | string[]> = { ...scope };
      if (params.goal_id) query.goal_id = String(params.goal_id);
      if (params.agent_id) query.agent_id = String(params.agent_id);
      if (params.node_id) query.node_id = String(params.node_id);
      if (params.focus_node_id) query.focus_node_id = String(params.focus_node_id);
      if (params.handoff) query.handoff = 'true';
      if (params.detail) query.detail = String(params.detail);
      if (locale) query.locale = String(locale);
      const expand = params.expand;
      if (expand) {
        query.expand = Array.isArray(expand) ? expand.map(String) : [String(expand)];
      }
      if (params.blocked_cursor) query.blocked_cursor = String(params.blocked_cursor);
      if (params.blocked_limit != null) {
        query.blocked_limit = String(params.blocked_limit);
      }
      if (params.workflow_run_id) {
        query.workflow_run_id = String(params.workflow_run_id);
      }
      const res = await this.client.get(`${this.orchestratorBase(projectId)}/work-next`, {
        params: query,
      });
      const data = res.data as Record<string, unknown>;
      return parseWorkNextPacket(data as Record<string, unknown>);
    }
    if (restHome && (claim || hasIngress)) {
      const postBody: Record<string, unknown> = {
        claim,
        ...scope,
        handoff: Boolean(params.handoff),
        detail: params.detail ?? 'compact',
      };
      if (params.goal_id) postBody.goal_id = String(params.goal_id);
      if (params.agent_id) postBody.agent_id = String(params.agent_id);
      if (params.prefer_agent_id) postBody.prefer_agent_id = String(params.prefer_agent_id);
      if (params.node_id) postBody.node_id = String(params.node_id);
      if (params.focus_node_id) postBody.focus_node_id = String(params.focus_node_id);
      if (locale) postBody.locale = String(locale);
      if (params.expand) {
        postBody.expand = Array.isArray(params.expand)
          ? params.expand.map(String)
          : [String(params.expand)];
      }
      if (params.blocked_cursor) postBody.blocked_cursor = String(params.blocked_cursor);
      if (params.blocked_limit != null) postBody.blocked_limit = params.blocked_limit;
      if (params.workflow_run_id) {
        postBody.workflow_run_id = String(params.workflow_run_id);
      }
      if (params.observed && typeof params.observed === 'object') {
        postBody.observed = params.observed;
      }
      const res = await this.client.post(
        `${this.orchestratorBase(projectId)}/work-next`,
        postBody,
      );
      const data = res.data as Record<string, unknown>;
      return parseWorkNextPacket(data as Record<string, unknown>);
    }
    const raw = await this.mcpAgentsAction(projectId, 'agents.work_next', params, {
      locale,
    });
    return parseWorkNextPacket(raw);
  }

  /**
   * MCP-only — ``agents.work_status`` lightweight plan summary (summary_only packet).
   */
  async workStatus(
    projectId: number,
    body?: {
      locale?: string;
      goal_id?: string;
      env_uuid?: string;
      home?: 'project' | 'self' | 'project_self';
    },
  ): Promise<import('../agents/planGraph').WorkNextPacket> {
    const { locale, ...params } = body ?? {};
    const { parseWorkNextPacket } = await import('../agents/planGraph');
    const raw = await this.mcpAgentsAction(projectId, 'agents.work_status', params, {
      locale,
    });
    return parseWorkNextPacket(raw);
  }

  /** MCP-only — ``agents.plan_execute`` closed-loop execute for a plan node. */
  async planExecute(
    projectId: number,
    body: {
      node_id: string;
      agent_id?: string;
      goal_text?: string;
      mode?: string;
      env_uuid?: string;
      locale?: string;
      home?: 'project' | 'self' | 'project_self';
    },
  ): Promise<Record<string, unknown>> {
    const { params, locale } = this.splitFleetLocale(body);
    return this.mcpAgentsAction(projectId, 'agents.plan_execute', params, { locale });
  }

  /** MCP-only — ``agents.ensure_agent`` preview or provision+bind for a plan node. */
  async ensureAgent(
    projectId: number,
    body: {
      node_id: string;
      create?: boolean;
      name?: string;
      env_uuid?: string;
      home?: 'project' | 'self' | 'project_self';
      locale?: string;
    },
  ): Promise<import('../agents/planGraph').EnsureAgentResult> {
    const { params, locale } = this.splitFleetLocale(body);
    return this.mcpAgentsAction(
      projectId,
      'agents.ensure_agent',
      params,
      { locale },
    ) as Promise<import('../agents/planGraph').EnsureAgentResult>;
  }

  /** MCP-only — ``agents.plan_recovery_scan`` verify_failed + stale claim preview. */
  async planRecoveryScan(
    projectId: number,
    body?: {
      limit?: number;
      env_uuid?: string;
      home?: 'project' | 'self' | 'project_self';
      locale?: string;
    },
  ): Promise<Record<string, unknown>> {
    const { locale, ...params } = body ?? {};
    return this.mcpAgentsAction(projectId, 'agents.plan_recovery_scan', params, { locale });
  }

  /** MCP-only — ``agents.team.create`` specialist fleet playbook ingest. */
  async teamCreate(
    projectId: number,
    body: { message: string; env_uuid?: string; locale?: string },
  ): Promise<Record<string, unknown>> {
    const { params, locale } = this.splitFleetLocale(body);
    return this.mcpAgentsAction(projectId, 'agents.team.create', params, { locale });
  }

  /** MCP-only — ``agents.reconcile_binding``. Fleet create stays on the production catalog. */
  async reconcileBinding(
    projectId: number,
    body?: {
      repair?: boolean;
      env_uuid?: string;
      home?: GraphHomeParam;
      locale?: string;
    },
  ): Promise<Record<string, unknown>> {
    const { params, locale } = this.splitFleetLocale(body ?? {});
    return this.mcpAgentsAction(projectId, 'agents.reconcile_binding', params, { locale });
  }

  /** MCP-only — ``agents.plan_reconcile_diagnostics``. */
  async planReconcileDiagnostics(
    projectId: number,
    body?: { env_uuid?: string; locale?: string; home?: GraphHomeParam },
  ): Promise<Record<string, unknown>> {
    const { params, locale } = this.splitFleetLocale(body ?? {});
    return this.mcpAgentsAction(projectId, 'agents.plan_reconcile_diagnostics', params, {
      locale,
    });
  }

  private splitFleetLocale<T extends Record<string, unknown>>(
    body: T,
    options?: { locale?: string },
  ): { params: Omit<T, 'locale'>; locale?: string } {
    const { locale: bodyLocale, ...rest } = body as T & { locale?: string };
    const locale =
      String(options?.locale ?? bodyLocale ?? '').trim() || undefined;
    return { params: rest as Omit<T, 'locale'>, locale };
  }

  private scrubPersonalHomeEnv(params: Record<string, unknown>): Record<string, unknown> {
    if (!isPersonalGraphHome(String(params.home ?? ''))) {
      return params;
    }
    const { env_uuid: _omit, ...rest } = params;
    return { ...rest, ...mcpGraphHomeFields(params.home as GraphHomeParam) };
  }

  private async mcpAgentsAction(
    projectId: number,
    action: string,
    params: Record<string, unknown> = {},
    options?: { locale?: string },
  ): Promise<Record<string, unknown>> {
    params = this.scrubPersonalHomeEnv({
      ...params,
      ...mcpGraphHomeFields(params.home as GraphHomeParam),
    });
    const context: Record<string, unknown> = {
      project_id: projectId,
      home: this.graphHomeParam(String(params.home ?? '')),
    };
    const locale = String(options?.locale ?? '').trim();
    if (locale) {
      context.locale = locale;
    }
    const res = await this.client.post('/mcp', {
      steps: [
        {
          id: action,
          action,
          params: { project_id: projectId, ...params },
        },
      ],
      context,
    });
    const envelope = res.data as {
      ok?: boolean;
      error_code?: string;
      results?: Array<{
        result?: Record<string, unknown>;
        data?: Record<string, unknown>;
        error?: string;
        error_code?: string;
        status?: string;
      }>;
      data?: Record<string, unknown>;
    };
    const { extractResults } = await import('../mcp/execute');
    const steps = extractResults(envelope);
    const step = steps[0];
    const batchMeta = extractBatchMeta(envelope);
    const failed =
      envelope.ok === false ||
      step?.status === 'error' ||
      Boolean(step?.error || step?.error_code);
    if (failed) {
      const code = String(step?.error_code || step?.error || envelope.error_code || 'mcp_error');
      const stepSlice =
        step?.result && typeof step.result === 'object'
          ? (step.result as Record<string, unknown>).instruction_slice
          : undefined;
      const err = new Error(code) as Error & {
        error_code?: string;
        step?: unknown;
        batchMeta?: Record<string, unknown>;
      };
      err.error_code = code;
      err.step = step;
      err.batchMeta = {
        ...batchMeta,
        ...(batchMeta.instruction_slice == null && stepSlice
          ? { instruction_slice: stepSlice }
          : {}),
      };
      throw err;
    }
    const rawPayload = step?.result ?? step?.data ?? envelope.data ?? envelope;
    const { data: normalized } = normalizeMcpToolEnvelope(rawPayload);
    const payload =
      normalized && Object.keys(normalized).length > 0
        ? normalized
        : (rawPayload as Record<string, unknown>);
    const { parseWorkNextFromMcpExecute } = await import('../agents/planGraph');
    const packet = parseWorkNextFromMcpExecute(payload, {
      ...batchMeta,
      ...(Array.isArray((envelope as { steps?: unknown }).steps)
        ? { steps: (envelope as { steps: unknown[] }).steps }
        : {}),
    });
    return packet as Record<string, unknown>;
  }

  /** Deterministic planner backlog — mirrors ``agents.plan_process_backlog``. */
  async processPlanBacklog(
    projectId: number,
    body?: {
      auto_apply?: boolean;
      auto_apply_policy?: 'off' | 'safe' | 'force';
      max_nodes?: number;
      node_id?: string;
      home?: 'project' | 'self' | 'project_self';
      env_uuid?: string;
      validation_mode?: 'strict' | 'persist_unexecutable';
    },
  ): Promise<{
    success: boolean;
    candidates?: string[];
    processed?: number;
    results?: Array<Record<string, unknown>>;
    graph_revision?: number;
    auto_apply_policy?: string;
  }> {
    const payload = this.scrubPersonalHomeEnv({
      ...(body ?? {}),
      ...mcpGraphHomeFields(body?.home),
    });
    const res = await this.client.post(
      `${this.orchestratorBase(projectId)}/plan/process-backlog`,
      payload,
    );
    return res.data as {
      success: boolean;
      candidates?: string[];
      processed?: number;
      results?: Array<Record<string, unknown>>;
      graph_revision?: number;
      auto_apply_policy?: string;
    };
  }

  async patchPlan(
    projectId: number,
    body: {
      patch: Record<string, unknown>;
      replace?: boolean;
      if_match_revision?: number;
      home?: 'project' | 'self' | 'project_self';
      replace_confirmed?: boolean;
      env_uuid?: string;
    },
  ): Promise<{ success: boolean; task_list?: Record<string, unknown> }> {
    const home = this.graphHomeParam(body.home);
    if (isPersonalGraphHome(home)) {
      return this.planPatchMcp(projectId, {
        patch: body.patch,
        replace: body.replace ?? false,
        ...(body.replace ? { replace_confirmed: body.replace_confirmed ?? true } : {}),
        ...(typeof body.if_match_revision === 'number'
          ? { if_match_revision: body.if_match_revision }
          : {}),
        home,
      }) as Promise<{ success: boolean; task_list?: Record<string, unknown> }>;
    }
    const envUuid = String(body.env_uuid ?? '').trim();
    const res = await this.client.patch(this.orchestratorBase(projectId), {
      patch: {
        task_list: body.patch,
        task_list_replace: body.replace ?? false,
        task_list_revision: body.if_match_revision,
      },
      ...(envUuid ? { env_uuid: envUuid } : {}),
    });
    return res.data as { success: boolean; task_list?: Record<string, unknown> };
  }

  /** MCP ``agents.plan_compaction_preview`` — dry-run compaction / spill advisory (read-only). */
  async planCompactionPreviewMcp(
    projectId: number,
    body: {
      home?: 'project' | 'self' | 'project_self';
      env_uuid?: string;
      locale?: string;
    },
  ): Promise<Record<string, unknown>> {
    const { params, locale } = this.splitFleetLocale(body);
    return this.mcpAgentsAction(projectId, 'agents.plan_compaction_preview', params, {
      locale,
    });
  }

  /** MCP ``agents.plan_heal_leaf`` — compact + spill bodies into work_graph/chunks. */
  async planHealLeafMcp(
    projectId: number,
    body: {
      home?: 'project' | 'self' | 'project_self';
      env_uuid?: string;
      dry_run?: boolean;
      locale?: string;
    },
  ): Promise<Record<string, unknown>> {
    const { params, locale } = this.splitFleetLocale(body);
    return this.mcpAgentsAction(projectId, 'agents.plan_heal_leaf', params, { locale });
  }

  /** MCP ``agents.plan_patch`` — patch, ops, CAS, archive (closed-loop SoT). */
  async planPatchMcp(
    projectId: number,
    body: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const { params, locale } = this.splitFleetLocale(body);
    return this.mcpAgentsAction(projectId, 'agents.plan_patch', params, { locale });
  }

  /** MCP ``agents.graph_file_put`` — upload + append ``meta.storage_refs``. */
  async graphFilePut(
    projectId: number,
    body: import('../agents/planGraph').PlanGraphFilePutBody & { locale?: string },
  ): Promise<Record<string, unknown>> {
    const { params, locale } = this.splitFleetLocale(body);
    return this.mcpAgentsAction(projectId, 'agents.graph_file_put', params, { locale });
  }

  async graphFileGet(
    projectId: number,
    body: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const { params, locale } = this.splitFleetLocale(body);
    return this.mcpAgentsAction(projectId, 'agents.graph_file_get', params, { locale });
  }

  async graphFileEdit(
    projectId: number,
    body: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const { params, locale } = this.splitFleetLocale(body);
    return this.mcpAgentsAction(projectId, 'agents.graph_file_edit', params, { locale });
  }

  async graphFileList(
    projectId: number,
    body: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const { params, locale } = this.splitFleetLocale(body);
    return this.mcpAgentsAction(projectId, 'agents.graph_file_list', params, { locale });
  }

  /** Sparse ops — ``agents.plan_patch`` with ``ops`` and no full replace. */
  async patchPlanOps(
    projectId: number,
    body: {
      ops: Array<Record<string, unknown>>;
      if_match_revision?: number;
      home?: 'project' | 'self' | 'project_self';
      env_uuid?: string;
      locale?: string;
      archive_ids?: string[];
      scope?: 'project' | 'agent';
      agent_id?: string;
    },
  ): Promise<import('../agents/planGraph').PlanPatchResult> {
    const { params, locale } = this.splitFleetLocale(body);
    const home = this.graphHomeParam(String(params.home ?? ''));
    const scope = String(params.scope ?? '').trim();
    const agentScope = String(params.agent_id ?? '').trim();
    const hasOps = Array.isArray(params.ops) && params.ops.length > 0;
    const hasArchive =
      Array.isArray(params.archive_ids) && params.archive_ids.length > 0;
    if (
      home === 'project' &&
      !locale &&
      scope !== 'agent' &&
      !agentScope &&
      (hasOps || hasArchive)
    ) {
      return this.postPlanOps(projectId, {
        ...(hasOps ? { ops: params.ops as Array<Record<string, unknown>> } : {}),
        ...(hasArchive ? { archive_ids: params.archive_ids as string[] } : {}),
        if_match_revision: params.if_match_revision as number | undefined,
        home: 'project',
        env_uuid: params.env_uuid as string | undefined,
      });
    }
    const raw = await this.mcpAgentsAction(projectId, 'agents.plan_patch', params, { locale });
    return raw as import('../agents/planGraph').PlanPatchResult;
  }

  /** REST sparse ops — ``POST …/orchestrator/plan/ops`` (HTTP integrators, no MCP). */
  async postPlanOps(
    projectId: number,
    body: import('../agents/planGraph').PlanOpsRequestBody,
  ): Promise<import('../agents/planGraph').PlanOpsResponse> {
    const payload = this.scrubPersonalHomeEnv({
      ...body,
      ...mcpGraphHomeFields(body.home),
    });
    const res = await this.client.post(
      `${this.orchestratorBase(projectId)}/plan/ops`,
      payload,
    );
    return res.data as import('../agents/planGraph').PlanOpsResponse;
  }

  /** MCP ``agents.plan_propose`` — personal/project_self graphs (no REST home yet). */
  async planProposeMcp(
    projectId: number,
    body: Record<string, unknown>,
  ): Promise<import('../agents/planGraph').PlanProposeResult> {
    const { params, locale } = this.splitFleetLocale(body);
    const raw = await this.mcpAgentsAction(projectId, 'agents.plan_propose', params, { locale });
    return raw as import('../agents/planGraph').PlanProposeResult;
  }

  /** MCP ``agents.plan_apply_proposal`` — persist proposal on the same home as propose. */
  async planApplyProposalMcp(
    projectId: number,
    body: Record<string, unknown>,
  ): Promise<import('../agents/planGraph').PlanApplyProposalResult> {
    const { params, locale } = this.splitFleetLocale(body);
    const raw = await this.mcpAgentsAction(
      projectId,
      'agents.plan_apply_proposal',
      params,
      { locale },
    );
    return raw as import('../agents/planGraph').PlanApplyProposalResult;
  }

  async getAgentPlan(
    projectId: number,
    agentId: string,
    options?: { include_execution_eligibility?: boolean; env_uuid?: string },
  ): Promise<{
    success: boolean;
    task_list?: Record<string, unknown>;
    plan_metrics?: Record<string, unknown>;
    task_list_revision?: number;
    execution_eligibility?: Record<string, unknown>;
  }> {
    const params: Record<string, string> = {};
    if (options?.include_execution_eligibility === true) {
      params.include_execution_eligibility = 'true';
    }
    const envUuid = String(options?.env_uuid ?? '').trim();
    if (envUuid) params.env_uuid = envUuid;
    const res = await this.client.get(
      `${this.orchestratorBase(projectId)}/plan/agent/${encodeURIComponent(agentId)}`,
      { params: Object.keys(params).length ? params : undefined },
    );
    return res.data as {
      success: boolean;
      task_list?: Record<string, unknown>;
      plan_metrics?: Record<string, unknown>;
      task_list_revision?: number;
      execution_eligibility?: Record<string, unknown>;
    };
  }

  async patchAgentPlan(
    projectId: number,
    agentId: string,
    body: {
      patch?: Record<string, unknown>;
      ops?: Array<Record<string, unknown>>;
      replace?: boolean;
      if_match_revision?: number;
      env_uuid?: string;
      archive_ids?: string[];
    },
  ): Promise<import('../agents/planGraph').PlanOpsResponse & { task_list?: Record<string, unknown> }> {
    const env = String(body.env_uuid ?? '').trim();
    const res = await this.client.patch(
      `${this.orchestratorBase(projectId)}/plan/agent/${encodeURIComponent(agentId)}`,
      {
        ...(body.patch ? { patch: body.patch } : {}),
        ...(body.ops?.length ? { ops: body.ops } : {}),
        replace: body.replace ?? false,
        if_match_revision: body.if_match_revision,
        ...(body.archive_ids?.length ? { archive_ids: body.archive_ids } : {}),
        ...(env ? { env_uuid: env } : {}),
      },
    );
    return res.data as import('../agents/planGraph').PlanOpsResponse & {
      task_list?: Record<string, unknown>;
    };
  }

  async exportOrchestratorPack(
    projectId: number,
    envUuid?: string,
    home?: 'project' | 'self' | 'project_self',
  ): Promise<{ success: boolean; pack: Record<string, unknown> }> {
    const scope = this.orchestratorScopeParams(home, envUuid);
    const params = new URLSearchParams(scope);
    const q = params.toString() ? `?${params.toString()}` : '';
    const res = await this.client.get(`${this.orchestratorBase(projectId)}/export-pack${q}`);
    return res.data as { success: boolean; pack: Record<string, unknown> };
  }

  async orchestrate(
    projectId: number,
    message: string,
    options: {
      channel?: 'workspace' | 'messenger' | 'bot' | 'mcp' | 'api';
      conversationId?: string;
      botUuid?: string;
      wait?: boolean;
      surface?: string;
      focusNodeId?: string;
      home?: 'project' | 'self' | 'project_self';
      envUuid?: string;
    } = {},
  ): Promise<import('../agents/planGraph').OrchestrateRunResponse> {
    const scope = this.orchestratorScopeParams(options.home, options.envUuid);
    const res = await this.client.post(`${this.orchestratorBase(projectId)}/run`, {
      message,
      channel: options.channel ?? 'api',
      conversation_id: options.conversationId,
      bot_uuid: options.botUuid,
      wait: options.wait ?? true,
      surface: options.surface,
      focus_node_id: options.focusNodeId,
      ...scope,
    });
    const { parseOrchestrateRunResponse } = await import('../agents/planGraph');
    return parseOrchestrateRunResponse(res.data, { focusNodeId: options.focusNodeId });
  }

  async importOrchestratorPack(
    projectId: number,
    pack: Record<string, unknown>,
    envUuid?: string,
    home?: 'project' | 'self' | 'project_self',
  ): Promise<{ success: boolean; orchestrator?: Record<string, unknown> }> {
    const scope = this.orchestratorScopeParams(home, envUuid);
    const res = await this.client.post(`${this.orchestratorBase(projectId)}/import-pack`, {
      pack,
      ...scope,
    });
    return res.data as { success: boolean; orchestrator?: Record<string, unknown> };
  }

  /**
   * Enqueue a fleet run. Server auto-builds orchestration seed from `input.message` /
   * `input.task` (same spine as MCP `agents.run`) — clients do not send orchestration blobs.
   * For plan-graph children, pass `plan_node_id` after `agents.plan_claim` (or orchestrator spawn).
   */
  async startRun(
    projectId: number,
    agentId: string,
    inputOrOptions: Record<string, unknown> | AgentStartRunOptions = {},
  ): Promise<{ success: boolean; run_uuid: string; work_item_id: string; run?: AgentRunRowDTO; duplicate?: boolean }> {
    const hasOptionsShape =
      'idempotency_key' in inputOrOptions ||
      'idempotencyKey' in inputOrOptions ||
      'wait' in inputOrOptions ||
      'wait_timeout_s' in inputOrOptions ||
      'waitTimeoutS' in inputOrOptions ||
      'envUuid' in inputOrOptions;
    const opts = hasOptionsShape ? (inputOrOptions as AgentStartRunOptions) : undefined;
    const body = opts ?? { input: inputOrOptions as Record<string, unknown> };
    const res = await this.client.post(
      `${this.base(projectId)}/${agentId}/runs/start`,
      {
        input: body.input ?? {},
        idempotency_key: body.idempotency_key ?? body.idempotencyKey,
        wait: body.wait,
        wait_timeout_s: body.wait_timeout_s ?? body.waitTimeoutS,
        parent_run_id: body.parent_run_id ?? body.parentRunId,
        root_run_id: body.root_run_id ?? body.rootRunId,
        handoff_to_agent_id: body.handoff_to_agent_id ?? body.handoffToAgentId,
        handoff_reason: body.handoff_reason ?? body.handoffReason,
      },
      agentsSandboxPostOptions({ envUuid: opts?.envUuid }),
    );
    return res.data;
  }

  /**
   * Buy compute credits (AGC) then enqueue a run (demo orchestration).
   * REST: ``POST .../agents/{agentId}/runs/with-agnt-credits``
   */
  async runWithAgntCredits(
    projectId: number,
    agentId: string,
    body: {
      input?: Record<string, unknown>;
      credits_atomic: number;
      idempotency_key: string;
      max_agnt_atomic?: number;
      quote_id: string;
      quote_hash: string;
      trace_id?: string;
    },
  ): Promise<Record<string, unknown>> {
    const res = await this.client.post<Record<string, unknown>>(
      `${this.base(projectId)}/${agentId}/runs/with-agnt-credits`,
      body,
      { skipBatching: true },
    );
    return res.data;
  }

  async listRuns(
    projectId: number,
    agentId: string,
    params?: AgentRunListFilters & AgentsEnvOpts,
  ): Promise<{ success: boolean; runs: AgentRunRowDTO[] }> {
    const { envUuid, ...filters } = params ?? {};
    const res = await this.client.get(
      `${this.base(projectId)}/${agentId}/runs`,
      {
        params: {
          status: filters?.status,
          since: filters?.since,
          with_agc_purchase:
            filters?.with_agc_purchase != null ? (filters.with_agc_purchase ? 'true' : 'false') : undefined,
          limit: filters?.limit,
        },
      },
      agentsSandboxGetOptions({ envUuid }),
    );
    return res.data as { success: boolean; runs: AgentRunRowDTO[] };
  }

  async listPendingApprovals(
    projectId: number,
    options: AgentPendingApprovalListOptions & AgentsEnvOpts = {},
  ): Promise<{ success: boolean; project_id: number; items: AgentPendingApprovalDTO[]; next_cursor?: string | null }> {
    const { envUuid, ...listOpts } = options;
    const res = await this.client.get(
      `${this.base(projectId)}/approvals/pending`,
      {
        params: {
          limit: listOpts.limit,
          stale_only: listOpts.stale_only ?? listOpts.staleOnly,
        },
      },
      agentsSandboxGetOptions({ envUuid }),
    );
    return res.data as {
      success: boolean;
      project_id: number;
      items: AgentPendingApprovalDTO[];
      next_cursor?: string | null;
    };
  }

  async getRun(
    projectId: number,
    agentId: string,
    runId: string,
    options?: AgentsEnvOpts,
  ): Promise<{ success: boolean; run: AgentRunRowDTO; run_detail?: AgentRunDetailDTO }> {
    const res = await this.client.get(
      `${this.base(projectId)}/${agentId}/runs/${runId}`,
      undefined,
      agentsSandboxGetOptions(options),
    );
    return res.data as { success: boolean; run: AgentRunRowDTO; run_detail?: AgentRunDetailDTO };
  }

  async getRunDetail(
    projectId: number,
    agentId: string,
    runId: string,
    options?: AgentsEnvOpts,
  ): Promise<AgentRunDetailDTO> {
    const res = await this.getRun(projectId, agentId, runId, options);
    if (!res.run_detail) throw new Error('run_detail_unavailable');
    return res.run_detail;
  }

  async fork(projectId: number, agentId: string): Promise<{ success: boolean; agent: AgentRowDTO }> {
    const res = await this.client.post(`${this.base(projectId)}/${agentId}/fork`, {});
    return res.data as { success: boolean; agent: AgentRowDTO };
  }

  async stopRun(
    projectId: number,
    agentId: string,
    runId: string,
    options: AgentStopRunOptions = {},
  ): Promise<{ success: boolean }> {
    const res = await this.client.post(
      `${this.base(projectId)}/${agentId}/runs/${runId}/stop`,
      {
        reason: options.reason,
        reviewer_note: options.reviewer_note ?? options.reviewerNote,
      },
      agentsSandboxPostOptions({ envUuid: options.envUuid }),
    );
    return res.data as { success: boolean };
  }

  async promote(projectId: number, agentId: string): Promise<Record<string, unknown>> {
    const res = await this.client.post(`${this.base(projectId)}/${agentId}/promote`, {});
    return res.data as Record<string, unknown>;
  }

  async kill(projectId: number, agentId: string): Promise<{ success: boolean; agent: AgentRowDTO }> {
    const res = await this.client.post(`${this.base(projectId)}/${agentId}/kill`, {});
    return res.data as { success: boolean; agent: AgentRowDTO };
  }

  async advanceRollout(projectId: number, agentId: string): Promise<{ success: boolean; agent: AgentRowDTO }> {
    const res = await this.client.post(`${this.base(projectId)}/${agentId}/rollout/advance`, {});
    return res.data as { success: boolean; agent: AgentRowDTO };
  }

  async trustSurface(
    projectId: number,
    agentId: string,
    options?: AgentsEnvOpts,
  ): Promise<Record<string, unknown>> {
    const res = await this.client.get(
      `${this.base(projectId)}/${agentId}/trust-surface`,
      undefined,
      agentsSandboxGetOptions(options),
    );
    return res.data as Record<string, unknown>;
  }

  async metrics(
    projectId: number,
    agentId: string,
    options?: AgentsEnvOpts,
  ): Promise<Record<string, unknown>> {
    const res = await this.client.get(
      `${this.base(projectId)}/${agentId}/metrics`,
      undefined,
      agentsSandboxGetOptions(options),
    );
    return res.data as Record<string, unknown>;
  }

  async gates(
    projectId: number,
    agentId: string,
    options?: AgentsEnvOpts,
  ): Promise<Record<string, unknown>> {
    const res = await this.client.get(
      `${this.base(projectId)}/${agentId}/gates`,
      undefined,
      agentsSandboxGetOptions(options),
    );
    return res.data as Record<string, unknown>;
  }

  async timeline(projectId: number, agentId: string): Promise<{ success: boolean; versions: AgentRowDTO[] }> {
    const res = await this.client.get(`${this.base(projectId)}/${agentId}/timeline`);
    return res.data as { success: boolean; versions: AgentRowDTO[] };
  }

  async traces(
    projectId: number,
    agentId: string,
    runId: string,
    options?: AgentsEnvOpts,
  ): Promise<AgentRunTracesDTO> {
    const res = await this.client.get(
      `${this.base(projectId)}/${agentId}/runs/${runId}/traces`,
      undefined,
      agentsSandboxGetOptions(options),
    );
    return res.data as AgentRunTracesDTO;
  }

  runStreamPath(projectId: number, agentId: string, runId: string): string {
    return `${this.base(projectId)}/${agentId}/runs/${runId}/stream`;
  }

  parseRunEventStream(source: Response | ReadableStream<Uint8Array>) {
    return parseAgentRunSSE(source);
  }

  /** Alias for ``parseRunEventStream`` (orchestration plan parity). */
  streamRunEvents(source: Response | ReadableStream<Uint8Array>) {
    return this.parseRunEventStream(source);
  }

  /** Personal agents (``GET /api/users/me/agents``). */
  async listMine(): Promise<{ success: boolean; agents: AgentRowDTO[]; home_project_id?: number }> {
    const res = await this.client.get('/users/me/agents');
    return res.data as { success: boolean; agents: AgentRowDTO[]; home_project_id?: number };
  }

  async getMine(agentId: string): Promise<{ success: boolean; agent: AgentRowDTO }> {
    const res = await this.client.get(`/users/me/agents/${agentId}`);
    return res.data as { success: boolean; agent: AgentRowDTO };
  }

  async createMine(name?: string): Promise<{ success: boolean; agent: AgentRowDTO }> {
    const res = await this.client.post('/users/me/agents', { name: name || 'Agent' });
    return res.data as { success: boolean; agent: AgentRowDTO };
  }

  async updateMine(agentId: string, agentSpec: Record<string, unknown>): Promise<{ success: boolean; agent: AgentRowDTO }> {
    const res = await this.client.put(`/users/me/agents/${agentId}`, { agent_spec: agentSpec });
    return res.data as { success: boolean; agent: AgentRowDTO };
  }

  async deleteMine(agentId: string): Promise<{ success: boolean }> {
    const res = await this.client.delete(`/users/me/agents/${agentId}`);
    return res.data as { success: boolean };
  }

  async startRunMine(
    agentId: string,
    inputOrOptions: Record<string, unknown> | AgentStartRunOptions = {},
  ): Promise<{ success: boolean; run_uuid: string; work_item_id: string; run?: AgentRunRowDTO; duplicate?: boolean }> {
    const hasOptionsShape =
      'idempotency_key' in inputOrOptions ||
      'wait' in inputOrOptions ||
      'wait_timeout_s' in inputOrOptions;
    const body = hasOptionsShape
      ? (inputOrOptions as AgentStartRunOptions)
      : { input: inputOrOptions as Record<string, unknown> };
    const res = await this.client.post(`/users/me/agents/${agentId}/runs/start`, {
      input: body.input ?? {},
      idempotency_key: body.idempotency_key,
      wait: body.wait,
      wait_timeout_s: body.wait_timeout_s,
      parent_run_id: body.parent_run_id,
      root_run_id: body.root_run_id,
      handoff_to_agent_id: body.handoff_to_agent_id,
      handoff_reason: body.handoff_reason,
    });
    return res.data;
  }

  async forkMine(agentId: string): Promise<{ success: boolean; agent: AgentRowDTO }> {
    const res = await this.client.post(`/users/me/agents/${agentId}/fork`, {});
    return res.data as { success: boolean; agent: AgentRowDTO };
  }

  async listRunsMine(
    agentId: string,
    params?: AgentRunListFilters,
  ): Promise<{ success: boolean; runs: AgentRunRowDTO[] }> {
    const res = await this.client.get(`/users/me/agents/${agentId}/runs`, {
      params: {
        status: params?.status,
        since: params?.since,
        with_agc_purchase:
          params?.with_agc_purchase != null ? (params.with_agc_purchase ? 'true' : 'false') : undefined,
      },
    });
    return res.data as { success: boolean; runs: AgentRunRowDTO[] };
  }

  async listPendingApprovalsMine(
    options: AgentPendingApprovalListOptions = {},
  ): Promise<{ success: boolean; project_id: number; items: AgentPendingApprovalDTO[]; next_cursor?: string | null }> {
    const res = await this.client.get('/users/me/agents/approvals/pending', {
      params: {
        limit: options.limit,
        stale_only: options.stale_only ?? options.staleOnly,
      },
    });
    return res.data as {
      success: boolean;
      project_id: number;
      items: AgentPendingApprovalDTO[];
      next_cursor?: string | null;
    };
  }

  async getRunMine(agentId: string, runId: string): Promise<{ success: boolean; run: AgentRunRowDTO; run_detail?: AgentRunDetailDTO }> {
    const res = await this.client.get(`/users/me/agents/${agentId}/runs/${runId}`);
    return res.data as { success: boolean; run: AgentRunRowDTO; run_detail?: AgentRunDetailDTO };
  }

  async getRunDetailMine(agentId: string, runId: string): Promise<AgentRunDetailDTO> {
    const res = await this.getRunMine(agentId, runId);
    if (!res.run_detail) throw new Error('run_detail_unavailable');
    return res.run_detail;
  }

  async stopRunMine(
    agentId: string,
    runId: string,
    options: AgentStopRunOptions = {},
  ): Promise<{ success: boolean }> {
    const res = await this.client.post(`/users/me/agents/${agentId}/runs/${runId}/stop`, {
      reason: options.reason,
      reviewer_note: options.reviewer_note ?? options.reviewerNote,
    });
    return res.data as { success: boolean };
  }

  async promoteMine(agentId: string): Promise<Record<string, unknown>> {
    const res = await this.client.post(`/users/me/agents/${agentId}/promote`, {});
    return res.data as Record<string, unknown>;
  }

  async killMine(agentId: string): Promise<{ success: boolean; agent: AgentRowDTO }> {
    const res = await this.client.post(`/users/me/agents/${agentId}/kill`, {});
    return res.data as { success: boolean; agent: AgentRowDTO };
  }

  async advanceRolloutMine(agentId: string): Promise<{ success: boolean; agent: AgentRowDTO }> {
    const res = await this.client.post(`/users/me/agents/${agentId}/rollout/advance`, {});
    return res.data as { success: boolean; agent: AgentRowDTO };
  }

  async metricsMine(agentId: string): Promise<Record<string, unknown>> {
    const res = await this.client.get(`/users/me/agents/${agentId}/metrics`);
    return res.data as Record<string, unknown>;
  }

  async gatesMine(agentId: string): Promise<Record<string, unknown>> {
    const res = await this.client.get(`/users/me/agents/${agentId}/gates`);
    return res.data as Record<string, unknown>;
  }

  async timelineMine(agentId: string): Promise<{ success: boolean; versions: AgentRowDTO[] }> {
    const res = await this.client.get(`/users/me/agents/${agentId}/timeline`);
    return res.data as { success: boolean; versions: AgentRowDTO[] };
  }

  async tracesMine(agentId: string, runId: string): Promise<AgentRunTracesDTO> {
    const res = await this.client.get(`/users/me/agents/${agentId}/runs/${runId}/traces`);
    return res.data as AgentRunTracesDTO;
  }

  async listTemplatesMine(): Promise<{ success: boolean; templates: AgentTemplateDTO[] }> {
    const res = await this.client.get('/users/me/agents/templates');
    return res.data as { success: boolean; templates: AgentTemplateDTO[] };
  }

  async createFromTemplateMine(body: {
    template_id: string;
    name?: string;
    description?: string;
    template_input?: Record<string, unknown>;
  }): Promise<{ success: boolean; agent: AgentRowDTO }> {
    const res = await this.client.post('/users/me/agents/from-template', {
      template_id: body.template_id,
      name: body.name ?? 'Agent',
      description: body.description ?? '',
      template_input: body.template_input ?? {},
    });
    return res.data as { success: boolean; agent: AgentRowDTO };
  }

  runStreamPathMine(agentId: string, runId: string): string {
    return `/users/me/agents/${agentId}/runs/${runId}/stream`;
  }

  async approveRunMine(
    agentId: string,
    runId: string,
    options: AgentApproveRunOptions = {},
  ): Promise<{ success: boolean; work_item_id?: string }> {
    const res = await this.client.post(`/users/me/agents/${agentId}/runs/${runId}/approve`, {
      reviewed_params: options.reviewed_params ?? options.reviewedParams,
      reviewer_note: options.reviewer_note ?? options.reviewerNote,
      approval_artifact_hash: options.approval_artifact_hash ?? options.approvalArtifactHash,
    });
    return res.data;
  }

  async attachSupportAiAgent(
    projectId: number,
    patch: Record<string, unknown>,
  ): Promise<{ config: Record<string, unknown> }> {
    const res = await this.client.put('/support/config', { patch }, { params: { project_id: projectId } });
    return res.data as { config: Record<string, unknown> };
  }

  /** Bind a logical project for chained calls */
  forProject(projectId: number) {
    const fleet = this;
    return {
      list: () => fleet.list(projectId),
      get: (agentId: string) => fleet.get(projectId, agentId),
      create: (name?: string) => fleet.create(projectId, name),
      listTemplates: () => fleet.listTemplates(projectId),
      automationMap: () => fleet.automationMap(projectId),
      fleetDiagnostics: () => fleet.fleetDiagnostics(projectId),
      reconcileRun: (runUuid: string) => fleet.reconcileRun(projectId, runUuid),
      sweepStaleRuns: (options?: AgentFleetSweepStaleRunsOptions) =>
        fleet.sweepStaleRuns(projectId, options),
      exportPack: (agentId: string) => fleet.exportPack(projectId, agentId),
      importPack: (body: Parameters<AgentsFleet['importPack']>[1]) =>
        fleet.importPack(projectId, body),
      compileWorkflow: (workflow: Record<string, unknown>) =>
        fleet.compileWorkflow(projectId, workflow),
      createFromTemplate: (body: Parameters<AgentsFleet['createFromTemplate']>[1]) =>
        fleet.createFromTemplate(projectId, body),
      update: (agentId: string, spec: Record<string, unknown>) => fleet.update(projectId, agentId, spec),
      delete: (agentId: string) => fleet.delete(projectId, agentId),
      startRun: (agentId: string, inputOrOptions?: Record<string, unknown> | AgentStartRunOptions) =>
        fleet.startRun(projectId, agentId, inputOrOptions),
      runWithAgntCredits: (agentId: string, body: Parameters<AgentsFleet['runWithAgntCredits']>[2]) =>
        fleet.runWithAgntCredits(projectId, agentId, body),
      listRuns: (agentId: string, opts?: Parameters<AgentsFleet['listRuns']>[2]) =>
        fleet.listRuns(projectId, agentId, opts),
      listPendingApprovals: (options?: AgentPendingApprovalListOptions) =>
        fleet.listPendingApprovals(projectId, options),
      getRun: (agentId: string, runId: string) => fleet.getRun(projectId, agentId, runId),
      getRunDetail: (agentId: string, runId: string) => fleet.getRunDetail(projectId, agentId, runId),
      fork: (agentId: string) => fleet.fork(projectId, agentId),
      stopRun: (agentId: string, runId: string, options?: AgentStopRunOptions) =>
        fleet.stopRun(projectId, agentId, runId, options),
      approveRun: (agentId: string, runId: string, options?: AgentApproveRunOptions) =>
        fleet.approveRun(projectId, agentId, runId, options),
      promote: (agentId: string) => fleet.promote(projectId, agentId),
      kill: (agentId: string) => fleet.kill(projectId, agentId),
      advanceRollout: (agentId: string) => fleet.advanceRollout(projectId, agentId),
      metrics: (agentId: string) => fleet.metrics(projectId, agentId),
      trustSurface: (agentId: string) => fleet.trustSurface(projectId, agentId),
      gates: (agentId: string) => fleet.gates(projectId, agentId),
      timeline: (agentId: string) => fleet.timeline(projectId, agentId),
      traces: (agentId: string, runId: string) => fleet.traces(projectId, agentId, runId),
      runStreamPath: (agentId: string, runId: string) =>
        fleet.runStreamPath(projectId, agentId, runId),
      parseRunEventStream: (source: Response | ReadableStream<Uint8Array>) =>
        fleet.parseRunEventStream(source),
      streamRunEvents: (source: Response | ReadableStream<Uint8Array>) =>
        fleet.streamRunEvents(source),
      attachSupportAiAgent: (p: Record<string, unknown>) => fleet.attachSupportAiAgent(projectId, p),
      previewPolicy: (body: AgentPolicyPreviewBody) => fleet.previewPolicy(projectId, body),
      previewTemplate: (body: AgentTemplatePreviewBody) => fleet.previewTemplate(projectId, body),
      updateSpecPatch: (agentId: string, patch: AgentSpecPatchDTO) =>
        fleet.updateSpecPatch(projectId, agentId, patch),
      workNext: (body?: Parameters<AgentsFleet['workNext']>[1]) => fleet.workNext(projectId, body),
      planExecute: (body: Parameters<AgentsFleet['planExecute']>[1]) =>
        fleet.planExecute(projectId, body),
    };
  }
}
