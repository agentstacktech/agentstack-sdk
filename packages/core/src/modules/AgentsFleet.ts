/**
 * Agents — REST facade for 8DNA-backed agents (project + personal).
 *
 * - ``/api/projects/{projectId}/agents/*`` — project agents
 * - ``/api/users/me/agents/*`` — personal agents (session ``project_id`` = home)
 *
 * Genetic tag: sdk.agents.gen1
 */

import { HTTPClient } from '../client/http-client';
import type { RunErrorV1 } from '../agents/runError';

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
}

export interface AgentApproveRunOptions {
  reviewed_params?: Record<string, unknown>;
  reviewer_note?: string;
  approval_artifact_hash?: string;
  reviewedParams?: Record<string, unknown>;
  reviewerNote?: string;
  approvalArtifactHash?: string;
}

export interface AgentStopRunOptions {
  reason?: string;
  reviewer_note?: string;
  reviewerNote?: string;
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

  async list(projectId: number): Promise<{ success: boolean; agents: AgentRowDTO[] }> {
    const res = await this.client.get(this.base(projectId));
    return res.data as { success: boolean; agents: AgentRowDTO[] };
  }

  async get(projectId: number, agentId: string): Promise<{ success: boolean; agent: AgentRowDTO }> {
    const res = await this.client.get(`${this.base(projectId)}/${agentId}`);
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

  async automationMap(projectId: number): Promise<{ success: boolean; agents: unknown[]; total: number }> {
    const res = await this.client.get(`${this.base(projectId)}/automation-map`);
    return res.data as { success: boolean; agents: unknown[]; total: number };
  }

  async fleetDiagnostics(projectId: number): Promise<AgentFleetDiagnosticsDTO> {
    const res = await this.client.get(`${this.base(projectId)}/fleet/diagnostics`);
    return res.data as AgentFleetDiagnosticsDTO;
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
    },
  ): Promise<{ success: boolean; agent: AgentRowDTO; bound_node_id?: string }> {
    const env = String(body.env_uuid ?? '').trim();
    const res = await this.client.post(`${this.base(projectId)}/from-template`, {
      template_id: body.template_id,
      name: body.name ?? 'Agent',
      description: body.description ?? '',
      template_input: body.template_input ?? {},
      ...(body.node_id ? { node_id: body.node_id } : {}),
      ...(env ? { env_uuid: env } : {}),
    });
    return res.data as { success: boolean; agent: AgentRowDTO; bound_node_id?: string };
  }

  async approveRun(
    projectId: number,
    agentId: string,
    runId: string,
    options: AgentApproveRunOptions = {},
  ): Promise<{ success: boolean; run_uuid?: string; work_item_id?: string }> {
    const res = await this.client.post(`${this.base(projectId)}/${agentId}/runs/${runId}/approve`, {
      reviewed_params: options.reviewed_params ?? options.reviewedParams,
      reviewer_note: options.reviewer_note ?? options.reviewerNote,
      approval_artifact_hash: options.approval_artifact_hash ?? options.approvalArtifactHash,
    });
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

  async delete(projectId: number, agentId: string): Promise<{ success: boolean }> {
    const res = await this.client.delete(`${this.base(projectId)}/${agentId}`);
    return res.data as { success: boolean };
  }

  private orchestratorBase(projectId: number): string {
    return `/api/projects/${projectId}/orchestrator`;
  }

  async getOrchestrator(
    projectId: number,
    options?: {
      include_analytics?: boolean;
      include_execution_eligibility?: boolean;
      compact?: boolean;
      env_uuid?: string;
    },
  ): Promise<{
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
  }> {
    const params: Record<string, string> = {};
    if (options?.include_analytics === true) params.include_analytics = 'true';
    if (options?.include_execution_eligibility === true) {
      params.include_execution_eligibility = 'true';
    }
    if (options?.compact === true) params.compact = 'true';
    const envUuid = String(options?.env_uuid ?? '').trim();
    if (envUuid) params.env_uuid = envUuid;
    const res = await this.client.get(this.orchestratorBase(projectId), {
      params: Object.keys(params).length ? params : undefined,
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

  /** Alias for orchestrator GET — mirrors ``agents.plan_get`` (project scope). */
  async planGet(
    projectId: number,
    options?: {
      include_analytics?: boolean;
      include_execution_eligibility?: boolean;
      compact?: boolean;
      env_uuid?: string;
    },
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
  ): Promise<{ success: boolean; orchestrator?: Record<string, unknown> }> {
    const env = String(envUuid ?? '').trim();
    const res = await this.client.patch(this.orchestratorBase(projectId), {
      patch,
      ...(env ? { env_uuid: env } : {}),
    });
    return res.data as { success: boolean; orchestrator?: Record<string, unknown> };
  }

  async refreshPlanAffinities(
    projectId: number,
    body?: {
      node_id?: string;
      pin_skills?: boolean;
      pin_genes?: boolean;
      env_uuid?: string;
    },
  ): Promise<{ success: boolean; task_list?: Record<string, unknown> }> {
    const res = await this.client.post(
      `${this.orchestratorBase(projectId)}/plan/refresh-affinities`,
      body ?? {},
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
    },
  ): Promise<{
    success: boolean;
    draft_children?: Array<Record<string, string>>;
    source?: string;
    intent_id?: string;
    heavy_llm?: boolean;
    llm_skipped?: string;
  }> {
    const res = await this.client.post(
      `${this.orchestratorBase(projectId)}/plan/suggest-draft`,
      body,
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
    const res = await this.client.post(
      `${this.orchestratorBase(projectId)}/plan/suggest-tree-draft`,
      body,
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
    },
  ): Promise<{
    success: boolean;
    claimed?: string[];
    task_list?: Record<string, unknown>;
    wip_full?: boolean;
  }> {
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
    body?: { env_uuid?: string },
  ): Promise<{
    success: boolean;
    reclaimed?: string[];
    task_list?: Record<string, unknown>;
  }> {
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
    },
  ): Promise<import('../agents/planGraph').PlanApplyProposalResult> {
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
   * MCP-only — ``agents.work_next`` next-work packet (read-only unless claim=true).
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
      env_uuid?: string;
      locale?: string;
      /** ``compact`` (default) for loop tokens; ``full`` for operator UI panels. */
      detail?: 'compact' | 'full';
    },
  ): Promise<import('../agents/planGraph').WorkNextPacket> {
    const { locale, ...params } = body ?? {};
    return this.mcpAgentsAction(projectId, 'agents.work_next', params, {
      locale,
    }) as Promise<import('../agents/planGraph').WorkNextPacket>;
  }

  /**
   * MCP-only — ``agents.work_status`` lightweight plan summary (summary_only packet).
   */
  async workStatus(
    projectId: number,
    body?: { locale?: string; goal_id?: string; env_uuid?: string },
  ): Promise<import('../agents/planGraph').WorkNextPacket> {
    const { locale, ...params } = body ?? {};
    return this.mcpAgentsAction(projectId, 'agents.work_status', params, {
      locale,
    }) as Promise<import('../agents/planGraph').WorkNextPacket>;
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
    },
  ): Promise<Record<string, unknown>> {
    return this.mcpAgentsAction(projectId, 'agents.plan_execute', body);
  }

  /** MCP-only — ``agents.ensure_agent`` preview or provision+bind for a plan node. */
  async ensureAgent(
    projectId: number,
    body: {
      node_id: string;
      create?: boolean;
      name?: string;
      env_uuid?: string;
    },
  ): Promise<import('../agents/planGraph').EnsureAgentResult> {
    return this.mcpAgentsAction(
      projectId,
      'agents.ensure_agent',
      body,
    ) as Promise<import('../agents/planGraph').EnsureAgentResult>;
  }

  /** MCP-only — ``agents.plan_recovery_scan`` verify_failed + stale claim preview. */
  async planRecoveryScan(
    projectId: number,
    body?: { limit?: number; env_uuid?: string },
  ): Promise<Record<string, unknown>> {
    return this.mcpAgentsAction(projectId, 'agents.plan_recovery_scan', body ?? {});
  }

  /** MCP-only — ``agents.team.create`` specialist fleet playbook ingest. */
  async teamCreate(
    projectId: number,
    body: { message: string; env_uuid?: string },
  ): Promise<Record<string, unknown>> {
    return this.mcpAgentsAction(projectId, 'agents.team.create', body);
  }

  /** MCP-only — ``agents.reconcile_binding``. Fleet create stays on the production catalog. */
  async reconcileBinding(
    projectId: number,
    body?: { repair?: boolean; env_uuid?: string },
  ): Promise<Record<string, unknown>> {
    return this.mcpAgentsAction(projectId, 'agents.reconcile_binding', body ?? {});
  }

  /** MCP-only — ``agents.plan_reconcile_diagnostics``. */
  async planReconcileDiagnostics(
    projectId: number,
    body?: { env_uuid?: string },
  ): Promise<Record<string, unknown>> {
    return this.mcpAgentsAction(projectId, 'agents.plan_reconcile_diagnostics', body ?? {});
  }

  private async mcpAgentsAction(
    projectId: number,
    action: string,
    params: Record<string, unknown> = {},
    options?: { locale?: string },
  ): Promise<Record<string, unknown>> {
    const context: Record<string, unknown> = { project_id: projectId };
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
    const step = envelope.results?.[0];
    const failed =
      envelope.ok === false ||
      step?.status === 'error' ||
      Boolean(step?.error || step?.error_code);
    if (failed) {
      const code = String(step?.error_code || step?.error || envelope.error_code || 'mcp_error');
      const err = new Error(code) as Error & { error_code?: string; step?: unknown };
      err.error_code = code;
      err.step = step;
      throw err;
    }
    const payload = (step?.result ?? step?.data ?? envelope.data ?? envelope) as Record<
      string,
      unknown
    >;
    return payload;
  }

  /** Deterministic planner backlog — mirrors ``agents.plan_process_backlog``. */
  async processPlanBacklog(
    projectId: number,
    body?: {
      auto_apply?: boolean;
      auto_apply_policy?: 'off' | 'safe' | 'force';
      max_nodes?: number;
      node_id?: string;
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
    const res = await this.client.post(
      `${this.orchestratorBase(projectId)}/plan/process-backlog`,
      body ?? {},
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
      env_uuid?: string;
    },
  ): Promise<{ success: boolean; task_list?: Record<string, unknown> }> {
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
      patch: Record<string, unknown>;
      replace?: boolean;
      if_match_revision?: number;
      env_uuid?: string;
    },
  ): Promise<{ success: boolean; task_list?: Record<string, unknown> }> {
    const env = String(body.env_uuid ?? '').trim();
    const res = await this.client.patch(
      `${this.orchestratorBase(projectId)}/plan/agent/${encodeURIComponent(agentId)}`,
      {
        patch: body.patch,
        replace: body.replace ?? false,
        if_match_revision: body.if_match_revision,
        ...(env ? { env_uuid: env } : {}),
      },
    );
    return res.data as { success: boolean; task_list?: Record<string, unknown> };
  }

  async exportOrchestratorPack(
    projectId: number,
    envUuid?: string,
  ): Promise<{ success: boolean; pack: Record<string, unknown> }> {
    const env = String(envUuid ?? '').trim();
    const q = env ? `?env_uuid=${encodeURIComponent(env)}` : '';
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
      envUuid?: string;
    } = {},
  ): Promise<{ success: boolean; run: Record<string, unknown> }> {
    const env = String(options.envUuid ?? '').trim();
    const res = await this.client.post(`${this.orchestratorBase(projectId)}/run`, {
      message,
      channel: options.channel ?? 'api',
      conversation_id: options.conversationId,
      bot_uuid: options.botUuid,
      wait: options.wait ?? true,
      surface: options.surface,
      focus_node_id: options.focusNodeId,
      ...(env ? { env_uuid: env } : {}),
    });
    return res.data as { success: boolean; run: Record<string, unknown> };
  }

  async importOrchestratorPack(
    projectId: number,
    pack: Record<string, unknown>,
    envUuid?: string,
  ): Promise<{ success: boolean; orchestrator?: Record<string, unknown> }> {
    const env = String(envUuid ?? '').trim();
    const res = await this.client.post(`${this.orchestratorBase(projectId)}/import-pack`, {
      pack,
      ...(env ? { env_uuid: env } : {}),
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
      'waitTimeoutS' in inputOrOptions;
    const body = hasOptionsShape
      ? (inputOrOptions as AgentStartRunOptions)
      : { input: inputOrOptions as Record<string, unknown> };
    const res = await this.client.post(`${this.base(projectId)}/${agentId}/runs/start`, {
      input: body.input ?? {},
      idempotency_key: body.idempotency_key ?? body.idempotencyKey,
      wait: body.wait,
      wait_timeout_s: body.wait_timeout_s ?? body.waitTimeoutS,
      parent_run_id: body.parent_run_id ?? body.parentRunId,
      root_run_id: body.root_run_id ?? body.rootRunId,
      handoff_to_agent_id: body.handoff_to_agent_id ?? body.handoffToAgentId,
      handoff_reason: body.handoff_reason ?? body.handoffReason,
    });
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
    params?: AgentRunListFilters,
  ): Promise<{ success: boolean; runs: AgentRunRowDTO[] }> {
    const res = await this.client.get(`${this.base(projectId)}/${agentId}/runs`, {
      params: {
        status: params?.status,
        since: params?.since,
        with_agc_purchase:
          params?.with_agc_purchase != null ? (params.with_agc_purchase ? 'true' : 'false') : undefined,
        limit: params?.limit,
      },
    });
    return res.data as { success: boolean; runs: AgentRunRowDTO[] };
  }

  async listPendingApprovals(
    projectId: number,
    options: AgentPendingApprovalListOptions = {},
  ): Promise<{ success: boolean; project_id: number; items: AgentPendingApprovalDTO[]; next_cursor?: string | null }> {
    const res = await this.client.get(`${this.base(projectId)}/approvals/pending`, {
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

  async getRun(
    projectId: number,
    agentId: string,
    runId: string,
  ): Promise<{ success: boolean; run: AgentRunRowDTO; run_detail?: AgentRunDetailDTO }> {
    const res = await this.client.get(`${this.base(projectId)}/${agentId}/runs/${runId}`);
    return res.data as { success: boolean; run: AgentRunRowDTO; run_detail?: AgentRunDetailDTO };
  }

  async getRunDetail(projectId: number, agentId: string, runId: string): Promise<AgentRunDetailDTO> {
    const res = await this.getRun(projectId, agentId, runId);
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
    const res = await this.client.post(`${this.base(projectId)}/${agentId}/runs/${runId}/stop`, {
      reason: options.reason,
      reviewer_note: options.reviewer_note ?? options.reviewerNote,
    });
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

  async trustSurface(projectId: number, agentId: string): Promise<Record<string, unknown>> {
    const res = await this.client.get(`${this.base(projectId)}/${agentId}/trust-surface`);
    return res.data as Record<string, unknown>;
  }

  async metrics(projectId: number, agentId: string): Promise<Record<string, unknown>> {
    const res = await this.client.get(`${this.base(projectId)}/${agentId}/metrics`);
    return res.data as Record<string, unknown>;
  }

  async gates(projectId: number, agentId: string): Promise<Record<string, unknown>> {
    const res = await this.client.get(`${this.base(projectId)}/${agentId}/gates`);
    return res.data as Record<string, unknown>;
  }

  async timeline(projectId: number, agentId: string): Promise<{ success: boolean; versions: AgentRowDTO[] }> {
    const res = await this.client.get(`${this.base(projectId)}/${agentId}/timeline`);
    return res.data as { success: boolean; versions: AgentRowDTO[] };
  }

  async traces(projectId: number, agentId: string, runId: string): Promise<AgentRunTracesDTO> {
    const res = await this.client.get(`${this.base(projectId)}/${agentId}/runs/${runId}/traces`);
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
    const c = this.client;
    return {
      list: () => new AgentsFleet(c).list(projectId),
      get: (agentId: string) => new AgentsFleet(c).get(projectId, agentId),
      create: (name?: string) => new AgentsFleet(c).create(projectId, name),
      listTemplates: () => new AgentsFleet(c).listTemplates(projectId),
      automationMap: () => new AgentsFleet(c).automationMap(projectId),
      fleetDiagnostics: () => new AgentsFleet(c).fleetDiagnostics(projectId),
      reconcileRun: (runUuid: string) => new AgentsFleet(c).reconcileRun(projectId, runUuid),
      sweepStaleRuns: (options?: AgentFleetSweepStaleRunsOptions) =>
        new AgentsFleet(c).sweepStaleRuns(projectId, options),
      exportPack: (agentId: string) => new AgentsFleet(c).exportPack(projectId, agentId),
      importPack: (body: Parameters<AgentsFleet['importPack']>[1]) =>
        new AgentsFleet(c).importPack(projectId, body),
      compileWorkflow: (workflow: Record<string, unknown>) =>
        new AgentsFleet(c).compileWorkflow(projectId, workflow),
      createFromTemplate: (body: Parameters<AgentsFleet['createFromTemplate']>[1]) =>
        new AgentsFleet(c).createFromTemplate(projectId, body),
      update: (agentId: string, spec: Record<string, unknown>) => new AgentsFleet(c).update(projectId, agentId, spec),
      delete: (agentId: string) => new AgentsFleet(c).delete(projectId, agentId),
      startRun: (agentId: string, inputOrOptions?: Record<string, unknown> | AgentStartRunOptions) =>
        new AgentsFleet(c).startRun(projectId, agentId, inputOrOptions),
      runWithAgntCredits: (agentId: string, body: Parameters<AgentsFleet['runWithAgntCredits']>[2]) =>
        new AgentsFleet(c).runWithAgntCredits(projectId, agentId, body),
      listRuns: (agentId: string, opts?: Parameters<AgentsFleet['listRuns']>[2]) =>
        new AgentsFleet(c).listRuns(projectId, agentId, opts),
      listPendingApprovals: (options?: AgentPendingApprovalListOptions) =>
        new AgentsFleet(c).listPendingApprovals(projectId, options),
      getRun: (agentId: string, runId: string) => new AgentsFleet(c).getRun(projectId, agentId, runId),
      getRunDetail: (agentId: string, runId: string) => new AgentsFleet(c).getRunDetail(projectId, agentId, runId),
      fork: (agentId: string) => new AgentsFleet(c).fork(projectId, agentId),
      stopRun: (agentId: string, runId: string, options?: AgentStopRunOptions) =>
        new AgentsFleet(c).stopRun(projectId, agentId, runId, options),
      approveRun: (agentId: string, runId: string, options?: AgentApproveRunOptions) =>
        new AgentsFleet(c).approveRun(projectId, agentId, runId, options),
      promote: (agentId: string) => new AgentsFleet(c).promote(projectId, agentId),
      kill: (agentId: string) => new AgentsFleet(c).kill(projectId, agentId),
      advanceRollout: (agentId: string) => new AgentsFleet(c).advanceRollout(projectId, agentId),
      metrics: (agentId: string) => new AgentsFleet(c).metrics(projectId, agentId),
      trustSurface: (agentId: string) => new AgentsFleet(c).trustSurface(projectId, agentId),
      gates: (agentId: string) => new AgentsFleet(c).gates(projectId, agentId),
      timeline: (agentId: string) => new AgentsFleet(c).timeline(projectId, agentId),
      traces: (agentId: string, runId: string) => new AgentsFleet(c).traces(projectId, agentId, runId),
      runStreamPath: (agentId: string, runId: string) =>
        new AgentsFleet(c).runStreamPath(projectId, agentId, runId),
      parseRunEventStream: (source: Response | ReadableStream<Uint8Array>) =>
        new AgentsFleet(c).parseRunEventStream(source),
      streamRunEvents: (source: Response | ReadableStream<Uint8Array>) =>
        new AgentsFleet(c).streamRunEvents(source),
      attachSupportAiAgent: (p: Record<string, unknown>) => new AgentsFleet(c).attachSupportAiAgent(projectId, p),
      previewPolicy: (body: AgentPolicyPreviewBody) => new AgentsFleet(c).previewPolicy(projectId, body),
      previewTemplate: (body: AgentTemplatePreviewBody) => new AgentsFleet(c).previewTemplate(projectId, body),
      updateSpecPatch: (agentId: string, patch: AgentSpecPatchDTO) =>
        new AgentsFleet(c).updateSpecPatch(projectId, agentId, patch),
    };
  }
}
