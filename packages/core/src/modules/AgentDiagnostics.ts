/**
 * Ecosystem admin diagnostics REST (`/api/diagnostics/*`).
 *
 * Genetic tag: shared.diagnostics.unified.gen1
 */

import { HTTPClient } from '../client/http-client';

export interface DiagnosticsProblemRow {
  id: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  title: string;
  message: string;
  source: string;
  timestamp: string;
  hint?: string;
}

export interface DiagnosticsProblemsPayload {
  problems: DiagnosticsProblemRow[];
  timestamp: string;
  capabilities?: Record<string, unknown>;
  platform_routers?: Record<string, unknown>;
}

export interface SecurityProbeMetricsPayload {
  timestamp: string;
  security_probe_hits?: Record<string, number>;
  security_probe_total?: number;
  security_uncovered_probe_paths?: Record<string, number>;
  security_uncovered_probe_total?: number;
  security_auth_fallback?: Record<string, number>;
  taxonomy_coverage_pct?: number;
  uncovered_top_paths?: Array<[string, number]>;
}

export interface AdminHubSnapshotSecurityProbes {
  security_probes?: SecurityProbeMetricsPayload;
  taxonomy_coverage_pct?: number;
  taxonomy_coverage_hint?: {
    uncovered_total?: number;
    uncovered_top_paths?: Array<[string, number]>;
  };
}

export class AgentDiagnostics {
  constructor(private client: HTTPClient) {}

  /** GET /api/diagnostics/problems */
  async getProblems(options?: { signal?: AbortSignal; force?: boolean }): Promise<DiagnosticsProblemsPayload> {
    const params = options?.force ? { force: 'true' } : undefined;
    const res = await this.client.get<DiagnosticsProblemsPayload>(
      '/diagnostics/problems',
      params,
      { signal: options?.signal },
    );
    return res.data;
  }

  /** GET /api/diagnostics/env — safe env names only (no secret values). */
  async getEnv(options?: { signal?: AbortSignal }): Promise<Record<string, unknown>> {
    const res = await this.client.get<Record<string, unknown>>(
      '/diagnostics/env',
      undefined,
      { signal: options?.signal },
    );
    return res.data;
  }

  /** GET /api/diagnostics/platform-runtime */
  async getPlatformRuntime(options?: { signal?: AbortSignal }): Promise<Record<string, unknown>> {
    const res = await this.client.get<Record<string, unknown>>(
      '/diagnostics/platform-runtime',
      undefined,
      { signal: options?.signal },
    );
    return res.data;
  }

  /** GET /api/diagnostics/security-probes — scanner probe counters. */
  async getSecurityProbeMetrics(options?: {
    signal?: AbortSignal;
  }): Promise<SecurityProbeMetricsPayload> {
    const res = await this.client.get<SecurityProbeMetricsPayload>(
      '/diagnostics/security-probes',
      undefined,
      { signal: options?.signal },
    );
    return res.data;
  }

  /** GET /api/diagnostics/neural-graph — Visualizer Gen2 BFF. */
  async getNeuralGraph(params: {
    include: string;
    project_id?: number;
    gene_heat_top_k?: number;
    signal?: AbortSignal;
  }): Promise<import('../diagnostics/neuralGraph').NeuralGraphData> {
    const q: Record<string, string | number> = { include: params.include };
    if (params.project_id != null) q.project_id = params.project_id;
    if (params.gene_heat_top_k != null) q.gene_heat_top_k = params.gene_heat_top_k;
    const res = await this.client.get<import('../diagnostics/neuralGraph').NeuralGraphData>(
      '/diagnostics/neural-graph',
      q,
      { signal: params.signal, skipCache: true } as { signal?: AbortSignal; skipCache?: boolean },
    );
    return res.data;
  }

  /** POST /api/diagnostics/promote-hot-gene */
  async promoteHotGene(
    body: Record<string, unknown>,
    options?: { signal?: AbortSignal },
  ): Promise<Record<string, unknown>> {
    const res = await this.client.post<Record<string, unknown>>(
      '/diagnostics/promote-hot-gene',
      body,
      { signal: options?.signal },
    );
    return res.data;
  }

  /** GET /api/diagnostics/gene-token-query */
  async geneTokenQuery(params: {
    tokens: string;
    project_id?: number;
    source?: string;
    limit?: number;
    signal?: AbortSignal;
  }): Promise<Record<string, unknown>> {
    const q: Record<string, string | number> = { tokens: params.tokens };
    if (params.project_id != null) q.project_id = params.project_id;
    if (params.source) q.source = params.source;
    if (params.limit != null) q.limit = params.limit;
    const res = await this.client.get<Record<string, unknown>>(
      '/diagnostics/gene-token-query',
      q,
      { signal: params.signal },
    );
    return res.data;
  }
}
