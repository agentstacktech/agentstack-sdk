/**
 * Production and development API base URLs (single source of truth).
 * Genetic tag: repo.platform.sdk.gen1
 */

/** Production origin — docs and integrator defaults. */
export const AGENTSTACK_PRODUCTION_ORIGIN = 'https://agentstack.tech' as const;

/** Production REST base (HTTPClient may append /api if only origin is passed). */
export const AGENTSTACK_PRODUCTION_API_BASE = `${AGENTSTACK_PRODUCTION_ORIGIN}/api` as const;

/** Local AgentStack Core default when no env and no browser origin. */
export const AGENTSTACK_DEV_API_BASE = 'http://localhost:8000/api' as const;

/** Node/scripts env var for API base override. */
export const ENV_API_BASE = 'AGENTSTACK_API_BASE' as const;

/**
 * Resolve apiBase for Node, examples, and automation.
 * Browser apps should pass explicit config or rely on HTTPClient same-origin rules.
 */
export function resolveAgentStackApiBase(override?: string): string {
  const fromEnv =
    typeof process !== 'undefined' && process.env
      ? process.env[ENV_API_BASE]?.trim()
      : undefined;
  const base = (override ?? fromEnv ?? AGENTSTACK_PRODUCTION_API_BASE).replace(/\/$/, '');
  return base;
}

/** True when apiBase or hostname indicates local development storage prefix rules. */
export function isAgentStackDevApiBase(apiBase: string): boolean {
  const lower = apiBase.toLowerCase();
  return (
    lower.includes('localhost') ||
    lower.includes('127.0.0.1') ||
    lower.includes(':5173') ||
    lower.includes(':5174') ||
    lower.includes(':5180')
  );
}

/** True for production agentstack.tech hosts (no dev storage prefix). */
export function isAgentStackProductionHost(apiBase: string): boolean {
  return apiBase.toLowerCase().includes('agentstack.tech');
}
