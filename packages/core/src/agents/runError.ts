/**
 * RunErrorV1 / ProviderStatusV1 — parity with MCP resume packet and REST run_detail.
 * @module @agentstack/sdk/agents/runError
 */

export type RunErrorV1 = {
  code?: string | null;
  message?: string | null;
  provider?: string | null;
  retryable?: boolean | null;
  category?: string | null;
  suggested_recovery?: string | null;
  raw?: string | null;
};

export type ProviderStatusV1 = {
  provider: string;
  model: string;
  usable: 'true' | 'false' | 'unknown';
  quota_status: 'ok' | 'exceeded' | 'unknown';
  reachability: 'ok' | 'blocked' | 'unknown';
  metadata_only?: boolean;
  preflight_required?: boolean;
};
