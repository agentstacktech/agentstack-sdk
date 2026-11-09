/** Map hosted player MCP failures for game UX (G6b W5-2). Gene: sdk.commerce.hosted.gen1 */

export type HostedMcpPlayerError = {
  code: string;
  message: string;
  recoverable: boolean;
};

function detailCode(body: unknown): string {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return '';
  const detail = (body as { detail?: unknown }).detail;
  if (typeof detail === 'string') return detail;
  if (detail && typeof detail === 'object' && !Array.isArray(detail)) {
    const code = (detail as { code?: unknown }).code;
    return typeof code === 'string' ? code : '';
  }
  return '';
}

/** Extract machine code + comfort copy from fetch/MCP errors. */
export function mapHostedMcpPlayerError(err: unknown): HostedMcpPlayerError {
  const row = err && typeof err === 'object' ? (err as Record<string, unknown>) : {};
  const fromBody = detailCode(row.body ?? row.data ?? row);
  const raw = String(row.error ?? row.message ?? err ?? '').trim();
  const code =
    fromBody ||
    (raw.includes('hosted_cookie_missing') ? 'hosted_cookie_missing' : '') ||
    (raw.includes('service_cap_denied') ? 'service_cap_denied' : '') ||
    (raw.includes('hosted_app_required') ? 'hosted_app_required' : '') ||
    raw.split(':', 1)[0] ||
    'hosted_mcp_error';
  const recoverable = new Set([
    'hosted_cookie_missing',
    'hosted_app_required',
    'auth_required',
  ]).has(code);
  const message =
    code === 'hosted_cookie_missing'
      ? 'Session cookie missing — sign in again or refresh the page.'
      : code === 'hosted_app_required'
        ? 'This action requires a hosted game session.'
        : raw || code;
  return { code, message, recoverable };
}
