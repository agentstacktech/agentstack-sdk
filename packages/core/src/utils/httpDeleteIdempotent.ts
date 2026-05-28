/**
 * Idempotent DELETE helpers: treat ``NotFoundError`` / HTTP 404 as success where
 * "already gone" is a valid outcome (mirrors ``agentstack-frontend`` ``httpErrorGuards``).
 */

import { NotFoundError } from '../types';

export function isNotFoundError(error: unknown): boolean {
  if (error instanceof NotFoundError) return true;
  if (!error || typeof error !== 'object') return false;
  const e = error as { name?: string; status?: number; statusCode?: number };
  return e.name === 'NotFoundError' || e.status === 404 || e.statusCode === 404;
}

/**
 * Run ``fn``; on not-found, return ``fallback`` instead of throwing.
 */
export async function executeOrNotFoundFallback<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (isNotFoundError(error)) return fallback;
    throw error;
  }
}
