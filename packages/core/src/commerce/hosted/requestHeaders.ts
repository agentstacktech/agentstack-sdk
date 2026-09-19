/**
 * REST headers for hosted commerce fetch (session vault + CSRF + project scope).
 * Gene: sdk.commerce.hosted.gen1
 */
import { readHostedSessionToken } from './sessionVault';

function readCsrfCookie(): string {
  if (typeof document === 'undefined') return '';
  try {
    for (const part of document.cookie.split(';')) {
      const trimmed = part.trim();
      if (trimmed.startsWith('csrf_token=')) {
        return decodeURIComponent(trimmed.slice('csrf_token='.length));
      }
    }
  } catch {
    /* ignore */
  }
  return '';
}

export function buildHostedCommerceHeaders(
  projectId: number | null,
  extra?: Record<string, string>,
): Record<string, string> {
  const headers: Record<string, string> = { Accept: 'application/json', ...(extra ?? {}) };
  const token = readHostedSessionToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (projectId) headers['X-Project-ID'] = String(projectId);
  const csrf = readCsrfCookie();
  if (csrf) headers['X-CSRF-Token'] = csrf;
  return headers;
}
