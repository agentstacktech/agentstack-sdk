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
}
