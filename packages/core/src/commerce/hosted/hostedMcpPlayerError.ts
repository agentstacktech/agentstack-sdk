/** Map hosted player MCP failures for game UX (G6b W5-2). Gene: sdk.commerce.hosted.gen1 */

export type HostedMcpPlayerError = {
  code: string;
  message: string;
  recoverable: boolean;
};

function detailCode(body: unknown): string {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return '';
  const row = body as Record<string, unknown>;
  const top = row.code ?? row.error_code;
  if (typeof top === 'string' && top.trim()) return top.trim();
  const detail = row.detail;
  if (typeof detail === 'string') return detail;
  if (detail && typeof detail === 'object' && !Array.isArray(detail)) {
    const d = detail as { code?: unknown; error_code?: unknown };
    const pick = d.error_code ?? d.code;
    return typeof pick === 'string' ? pick.trim() : '';
  }
  return '';
}

/** Extract machine code + comfort copy from fetch/MCP errors. */
export function mapHostedMcpPlayerError(err: unknown): HostedMcpPlayerError {
  const row = err && typeof err === 'object' ? (err as Record<string, unknown>) : {};
  const fromAssign =
    typeof row.code === 'string' && row.code.trim() ? row.code.trim() : '';
  const fromBody = detailCode(row.body ?? row.data ?? row);
  const raw = String(row.error ?? row.message ?? err ?? '').trim();
  const code =
    fromAssign ||
    fromBody ||
    (raw.includes('hosted_cookie_missing') ? 'hosted_cookie_missing' : '') ||
    (raw.includes('service_cap_denied') ? 'service_cap_denied' : '') ||
    (raw.includes('hosted_app_required') ? 'hosted_app_required' : '') ||
    (raw.includes('export_not_public') ? 'export_not_public' : '') ||
    (raw.includes('public_run_caps_exceed_ceiling')
      ? 'public_run_caps_exceed_ceiling'
      : '') ||
    (raw.includes('hosted_shared_data_denied') ? 'hosted_shared_data_denied' : '') ||
    (raw.includes('text_revision_conflict') ? 'text_revision_conflict' : '') ||
    (raw.includes('not_a_member') ? 'not_a_member' : '') ||
    raw.split(':', 1)[0] ||
    'hosted_mcp_error';
  const recoverable = new Set([
    'hosted_cookie_missing',
    'hosted_app_required',
    'auth_required',
    'export_not_public',
    'text_revision_conflict',
    'hosted_shared_data_denied',
    'db_unavailable',
    'revision_prefetch_failed',
    'revision_conflict',
    'run_in_progress',
    'run_lock_timeout',
  ]).has(code);
  const message =
    code === 'hosted_cookie_missing'
      ? 'Session cookie missing — sign in again or refresh the page.'
      : code === 'hosted_app_required'
        ? 'This action requires a hosted game session.'
        : code === 'export_not_public'
          ? 'This action is not enabled for hosted players — publish with public_run.'
          : code === 'public_run_caps_exceed_ceiling'
            ? 'Script caps exceed the hosted visitor ceiling — narrow export caps or use operator MCP.'
          : code === 'hosted_shared_data_denied'
            ? 'This game data path is not enabled for hosted players — check tenant shared_data_prefixes.'
          : code === 'text_revision_conflict'
            ? 'Someone else updated the room — refresh and retry.'
          : code === 'not_a_member'
            ? 'You need write access on this project to play online.'
          : code === 'auth_required'
            ? 'Sign in to this hosted game before saving multiplayer state.'
          : code === 'db_unavailable'
            ? 'Database or match state is busy — wait and retry the same action.'
          : code === 'revision_conflict' || code === 'text_revision_conflict'
            ? 'Match revision moved — refresh lobby state and retry.'
          : code === 'run_in_progress' || code === 'run_lock_timeout'
            ? 'Another script.run is in flight — wait a moment and retry.'
            : raw || code;
  return { code, message, recoverable };
}
