/**
 * MCP URL / token helpers (promoted from genetic-ai-starter recipe-common).
 * Genetic tag: repo.tooling.user_cli.gen1 · repo.platform.sdk.gen1
 */

/** Derive MCP origin URL from REST apiBase (`…/api` → `…/mcp`). */
export function resolveMcpUrl(apiBase: string): string {
  const trimmed = String(apiBase || '').replace(/\/$/, '');
  const origin = trimmed.endsWith('/api') ? trimmed.slice(0, -4) : trimmed;
  return `${origin}/mcp`;
}

/** Bearer / API key for MCP from standard env vars. */
export function resolveMcpAuthToken(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = typeof process !== 'undefined'
    ? process.env
    : {},
): string | undefined {
  const v =
    env.AGENTSTACK_API_KEY?.trim() ||
    env.AGENTSTACK_ACCESS_TOKEN?.trim() ||
    env.AGENTSTACK_TOKEN?.trim();
  return v || undefined;
}

/** Public site origin for Activate URL (strip trailing /api). */
export function resolvePublicOrigin(apiBase: string): string {
  const trimmed = String(apiBase || 'https://agentstack.tech/api').replace(/\/$/, '');
  return trimmed.endsWith('/api') ? trimmed.slice(0, -4) : trimmed;
}
