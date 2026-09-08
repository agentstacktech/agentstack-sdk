import type { PathSessionIndex } from '../types/playbookTypes';

function isSessionRow(
  value: unknown,
): value is PathSessionIndex['sessions'][number] {
  if (!value || typeof value !== 'object') return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.playbookId === 'string' &&
    row.playbookId.length > 0 &&
    typeof row.percent === 'number' &&
    Number.isFinite(row.percent) &&
    typeof row.currentStepId === 'string' &&
    typeof row.title === 'string' &&
    typeof row.updatedAt === 'string'
  );
}

/** Coerce corrupted localStorage index rows — prevents hub crash after login. */
export function normalizePathSessionIndex(raw: unknown): PathSessionIndex {
  if (!raw || typeof raw !== 'object') {
    return { activePlaybookId: null, sessions: [] };
  }
  const parsed = raw as Partial<PathSessionIndex>;
  const activePlaybookId =
    typeof parsed.activePlaybookId === 'string' && parsed.activePlaybookId.length > 0
      ? parsed.activePlaybookId
      : null;
  const sessions = Array.isArray(parsed.sessions)
    ? parsed.sessions.filter(isSessionRow)
    : [];
  return { activePlaybookId, sessions };
}
