/** Readable text for FastAPI ``detail`` objects that use a ``code`` field. */
function formatStructuredApiDetail(o: Record<string, unknown>): string | null {
  if (typeof o.code !== 'string') return null;
  const code = o.code;
  if (code === 'push_channel_map_too_large') {
    const max = typeof o.max_overrides === 'number' ? o.max_overrides : '?';
    return `Too many per-chat notification overrides (maximum ${max}).`;
  }
  if (typeof o.message === 'string' && o.message.trim()) return o.message.trim();
  return code.replace(/_/g, ' ');
}

/**
 * Extract a human-readable message from SDK / fetch / axios-like errors.
 */
export function getApiErrorMessage(err: unknown): string {
  if (err == null) return 'Unknown error';
  if (typeof err === 'string') return err;
  const ax = err as {
    response?: { data?: { detail?: unknown; message?: string; code?: string } };
    message?: string;
    apiCode?: string;
    code?: string;
    name?: string;
  };
  const data = ax.response?.data;
  if (data?.detail != null) {
    const d = data.detail;
    if (typeof d === 'string') return d;
    if (typeof d === 'object' && d !== null) {
      const o = d as Record<string, unknown>;
      if (typeof o.error === 'string') return o.error;
      if (typeof o.message === 'string') return o.message;
      const structured = formatStructuredApiDetail(o);
      if (structured) return structured;
    }
  }
  if (typeof data?.message === 'string') return data.message;
  const apiCode =
    (typeof ax.apiCode === 'string' && ax.apiCode) ||
    (typeof ax.code === 'string' && ax.code) ||
    (typeof data?.code === 'string' && data.code) ||
    '';
  if (
    apiCode === 'dna_timeout' ||
    apiCode === 'dna_overloaded' ||
    apiCode === 'auth_me_db_timeout'
  ) {
    return 'Server is busy — please try again shortly.';
  }
  if (ax.name === 'TimeoutError' || /timeout/i.test(String(ax.message || ''))) {
    return 'Request timed out — please try again.';
  }
  if (err instanceof Error && err.message) return err.message;
  if (typeof ax.message === 'string' && ax.message) return ax.message;
  return 'Request failed';
}

export function httpErrorStatus(err: unknown): number | undefined {
  if (err == null || typeof err !== 'object') return undefined;
  const o = err as Record<string, unknown>;
  if (typeof o.status === 'number') return o.status;
  const resp = o.response as Record<string, unknown> | undefined;
  if (resp && typeof resp.status === 'number') return resp.status as number;
  return undefined;
}
