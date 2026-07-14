/**
 * Agents — REST facade for 8DNA-backed agents (project + personal).
 *
 * - ``/api/projects/{projectId}/agents/*`` — project agents
 * - ``/api/users/me/agents/*`` — personal agents (session ``project_id`` = home)
 *
 * Genetic tag: sdk.agents.gen1
 */

import { HTTPClient } from '../client/http-client';

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

  async createFromTemplate(
    projectId: number,
    body: { template_id: string; name?: string; description?: string; template_input?: Record<string, unknown> },
  ): Promise<{ success: boolean; agent: AgentRowDTO }> {
    const res = await this.client.post(`${this.base(projectId)}/from-template`, {
      template_id: body.template_id,
      name: body.name ?? 'Agent',
      description: body.description ?? '',
      template_input: body.template_input ?? {},
    });
    return res.data as { success: boolean; agent: AgentRowDTO };
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
      attachSupportAiAgent: (p: Record<string, unknown>) => new AgentsFleet(c).attachSupportAiAgent(projectId, p),
      previewPolicy: (body: AgentPolicyPreviewBody) => new AgentsFleet(c).previewPolicy(projectId, body),
      previewTemplate: (body: AgentTemplatePreviewBody) => new AgentsFleet(c).previewTemplate(projectId, body),
      updateSpecPatch: (agentId: string, patch: AgentSpecPatchDTO) =>
        new AgentsFleet(c).updateSpecPatch(projectId, agentId, patch),
    };
  }
}
