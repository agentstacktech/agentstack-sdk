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
  data?: Record<string, unknown>;
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
  ): Promise<{ success: boolean; run_uuid?: string; work_item_id?: string }> {
    const res = await this.client.post(`${this.base(projectId)}/${agentId}/runs/${runId}/approve`, {});
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
    input: Record<string, unknown> = {},
  ): Promise<{ success: boolean; run_uuid: string; work_item_id: string }> {
    const res = await this.client.post(`${this.base(projectId)}/${agentId}/runs/start`, { input });
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
    params?: { with_agc_purchase?: boolean },
  ): Promise<{ success: boolean; runs: unknown[] }> {
    const res = await this.client.get(`${this.base(projectId)}/${agentId}/runs`, {
      params:
        params?.with_agc_purchase != null
          ? { with_agc_purchase: params.with_agc_purchase ? 'true' : 'false' }
          : undefined,
    });
    return res.data as { success: boolean; runs: unknown[] };
  }

  async fork(projectId: number, agentId: string): Promise<{ success: boolean; agent: AgentRowDTO }> {
    const res = await this.client.post(`${this.base(projectId)}/${agentId}/fork`, {});
    return res.data as { success: boolean; agent: AgentRowDTO };
  }

  async stopRun(projectId: number, agentId: string, runId: string): Promise<{ success: boolean }> {
    const res = await this.client.post(`${this.base(projectId)}/${agentId}/runs/${runId}/stop`, {});
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

  async traces(projectId: number, agentId: string, runId: string): Promise<Record<string, unknown>> {
    const res = await this.client.get(`${this.base(projectId)}/${agentId}/runs/${runId}/traces`);
    return res.data as Record<string, unknown>;
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

  async startRunMine(agentId: string, input: Record<string, unknown> = {}): Promise<{ success: boolean; run_uuid: string; work_item_id: string }> {
    const res = await this.client.post(`/users/me/agents/${agentId}/runs/start`, { input });
    return res.data;
  }

  async forkMine(agentId: string): Promise<{ success: boolean; agent: AgentRowDTO }> {
    const res = await this.client.post(`/users/me/agents/${agentId}/fork`, {});
    return res.data as { success: boolean; agent: AgentRowDTO };
  }

  async listRunsMine(agentId: string): Promise<{ success: boolean; runs: unknown[] }> {
    const res = await this.client.get(`/users/me/agents/${agentId}/runs`);
    return res.data as { success: boolean; runs: unknown[] };
  }

  async stopRunMine(agentId: string, runId: string): Promise<{ success: boolean }> {
    const res = await this.client.post(`/users/me/agents/${agentId}/runs/${runId}/stop`, {});
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

  async tracesMine(agentId: string, runId: string): Promise<Record<string, unknown>> {
    const res = await this.client.get(`/users/me/agents/${agentId}/runs/${runId}/traces`);
    return res.data as Record<string, unknown>;
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

  async approveRunMine(agentId: string, runId: string): Promise<{ success: boolean; work_item_id?: string }> {
    const res = await this.client.post(`/users/me/agents/${agentId}/runs/${runId}/approve`, {});
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
      startRun: (agentId: string, input?: Record<string, unknown>) =>
        new AgentsFleet(c).startRun(projectId, agentId, input),
      runWithAgntCredits: (agentId: string, body: Parameters<AgentsFleet['runWithAgntCredits']>[2]) =>
        new AgentsFleet(c).runWithAgntCredits(projectId, agentId, body),
      listRuns: (agentId: string, opts?: Parameters<AgentsFleet['listRuns']>[2]) =>
        new AgentsFleet(c).listRuns(projectId, agentId, opts),
      fork: (agentId: string) => new AgentsFleet(c).fork(projectId, agentId),
      stopRun: (agentId: string, runId: string) => new AgentsFleet(c).stopRun(projectId, agentId, runId),
      approveRun: (agentId: string, runId: string) => new AgentsFleet(c).approveRun(projectId, agentId, runId),
      promote: (agentId: string) => new AgentsFleet(c).promote(projectId, agentId),
      kill: (agentId: string) => new AgentsFleet(c).kill(projectId, agentId),
      advanceRollout: (agentId: string) => new AgentsFleet(c).advanceRollout(projectId, agentId),
      metrics: (agentId: string) => new AgentsFleet(c).metrics(projectId, agentId),
      trustSurface: (agentId: string) => new AgentsFleet(c).trustSurface(projectId, agentId),
      gates: (agentId: string) => new AgentsFleet(c).gates(projectId, agentId),
      traces: (agentId: string, runId: string) => new AgentsFleet(c).traces(projectId, agentId, runId),
      attachSupportAiAgent: (p: Record<string, unknown>) => new AgentsFleet(c).attachSupportAiAgent(projectId, p),
      previewPolicy: (body: AgentPolicyPreviewBody) => new AgentsFleet(c).previewPolicy(projectId, body),
      previewTemplate: (body: AgentTemplatePreviewBody) => new AgentsFleet(c).previewTemplate(projectId, body),
      updateSpecPatch: (agentId: string, patch: AgentSpecPatchDTO) =>
        new AgentsFleet(c).updateSpecPatch(projectId, agentId, patch),
    };
  }
}
