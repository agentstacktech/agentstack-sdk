/** Map hosted player MCP failures for game UX (G6b W5-2). Gene: sdk.commerce.hosted.gen1 */

export type HostedMcpPlayerError = {
  code: string;
  message: string;
  recoverable: boolean;
};

/** Machine codes that may use executeHostedMcpStepsWithRetry (G6b / Nahual open). */
export const HOSTED_MCP_RECOVERABLE_CODES = [
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
  'neural_flush',
  'neural_flush_backlog',
] as const;

function bodyFailurePhase(body: unknown): string {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return '';
  const row = body as Record<string, unknown>;
  const direct = row.failure_phase;
  if (typeof direct === 'string' && direct.trim()) return direct.trim();
  const data = row.data;
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    const fp = (data as Record<string, unknown>).failure_phase;
    if (typeof fp === 'string' && fp.trim()) return fp.trim();
  }
  const timings = row.timings;
  if (timings && typeof timings === 'object' && !Array.isArray(timings)) {
    if ((timings as Record<string, unknown>).neural_flush_backlog === true) {
      return 'neural_flush_backlog';
    }
  }
  if (row.runtime_neural_staged === true && row.dna_persisted === false) {
    return 'neural_flush';
  }
  return '';
}

function detailCode(body: unknown): string {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return '';
  const row = body as Record<string, unknown>;
  const top = row.code ?? row.error_code ?? row.error;
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
  const bodyBlob = row.body ?? row.data ?? row;
  const failurePhase = bodyFailurePhase(bodyBlob);
  let resolvedCode = code;
  if (
    (code === 'db_unavailable' || code === 'commit_failed') &&
    (failurePhase === 'neural_flush' || failurePhase === 'neural_flush_backlog')
  ) {
    resolvedCode = failurePhase;
  }
  const recoverable = new Set<string>(HOSTED_MCP_RECOVERABLE_CODES).has(resolvedCode);
  const message =
    resolvedCode === 'neural_flush' || resolvedCode === 'neural_flush_backlog'
      ? 'Match state is syncing to the server — keep the same action; we will retry shortly.'
      : code === 'hosted_cookie_missing'
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
  return { code: resolvedCode, message, recoverable };
}

export function isHostedMcpRetryableError(err: unknown): boolean {
  const mapped = mapHostedMcpPlayerError(err);
  return mapped.recoverable;
}

/** Success-path hosted script.run: show «syncing» until DNA flush completes (neural defer). */
export type HostedRunPhase = 'syncing' | 'ready' | 'error';

export function hostedRunPhase(row: Record<string, unknown> | null | undefined): HostedRunPhase {
  if (!row || typeof row !== 'object') return 'error';
  if (row.ok === false) return 'error';
  if (row.runtime_neural_staged === true && row.dna_persisted === false) return 'syncing';
  const timings = row.timings;
  if (timings && typeof timings === 'object' && !Array.isArray(timings)) {
    const t = timings as Record<string, unknown>;
    if (t.neural_defer === true || t.neural_flush_backlog === true) return 'syncing';
  }
  return 'ready';
}
