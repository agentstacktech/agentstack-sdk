/**
 * OpTrace client facade: stable event ids + correlation ids for server ring buffers.
 * Server records English `msg` and structured `attrs`; client only sets headers and local logs.
 *
 * When ``AGENTSTACK_CLIENT_OPTRACE=1``, batches debug+ logs to
 * ``POST /api/diagnostics/client/ops-beacons`` (best-effort).
 */

import { logger, LogLevel } from './logger';

let lastRequestId: string | null = null;
let lastTraceId: string | null = null;

const OPTRACE_BUFFER: Array<{
  level: OpTraceLevel;
  event: string;
  msg: string;
  attrs?: Record<string, unknown>;
  ts_ms: number;
}> = [];
const OPTRACE_FLUSH_MS = 10_000;
const OPTRACE_BATCH_MAX = 64;
let optraceFlushTimer: ReturnType<typeof setInterval> | null = null;

function isClientOpTraceBatchEnabled(): boolean {
  if (typeof process !== 'undefined' && process.env?.AGENTSTACK_CLIENT_OPTRACE === '1') {
    return true;
  }
  if (typeof globalThis !== 'undefined') {
    const g = globalThis as { AGENTSTACK_CLIENT_OPTRACE?: string };
    return g.AGENTSTACK_CLIENT_OPTRACE === '1';
  }
  return false;
}

async function flushOpTraceBatch(): Promise<void> {
  if (!OPTRACE_BUFFER.length || typeof fetch === 'undefined') return;
  // Ф13: never POST without a usable Bearer — unauthenticated posts cause 401 storms.
  let authHeader: Record<string, string> = {};
  if (typeof window === 'undefined') return;
  try {
    const token =
      (window as Window & { __AGENTSTACK_ACCESS_TOKEN__?: string }).__AGENTSTACK_ACCESS_TOKEN__ ||
      (typeof sessionStorage !== 'undefined'
        ? sessionStorage.getItem('access_token') || sessionStorage.getItem('agentstack_access_token')
        : null);
    if (!token) return;
    const parts = token.split('.');
    if (parts.length >= 2) {
      try {
        const b64 = parts[1]!.replace(/-/g, '+').replace(/_/g, '/');
        const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
        const payload = JSON.parse(atob(padded)) as { exp?: number };
        const exp = Number(payload?.exp ?? 0);
        if (!Number.isFinite(exp) || exp * 1000 <= Date.now() + 30_000) {
          return;
        }
      } catch {
        return;
      }
    }
    authHeader = { Authorization: `Bearer ${token}` };
  } catch {
    return;
  }
  const batch = OPTRACE_BUFFER.splice(0, OPTRACE_BATCH_MAX);
  try {
    const origin = window.location?.origin || '';
    await fetch(`${origin}/api/diagnostics/client/ops-beacons`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...authHeader },
      body: JSON.stringify({
        events: batch.map((row) => ({
          event: `sdk.optrace.${row.event}`.slice(0, 96),
          tag: row.level,
          ts_ms: row.ts_ms,
          payload: { msg: row.msg, ...(row.attrs ?? {}) },
        })),
      }),
    });
  } catch {
    /* best-effort */
  }
}

function scheduleOpTraceFlush(): void {
  if (optraceFlushTimer !== null) return;
  optraceFlushTimer = setInterval(() => {
    void flushOpTraceBatch();
  }, OPTRACE_FLUSH_MS);
}

function randomId(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
}

/**
 * Returns correlation ids for outbound HTTP calls (idempotent per call site if headers already set).
 */
export function getOrCreateCorrelationIds(
  existing?: Record<string, string>
): { requestId: string; traceId: string } {
  const lower = existing
    ? Object.fromEntries(
        Object.entries(existing).map(([k, v]) => [k.toLowerCase(), String(v ?? '').trim()])
      )
    : {};
  const pick = (k1: string, k2: string) => {
    const a = (lower[k1] || '').trim();
    const b = (lower[k2] || '').trim();
    return a || b || '';
  };
  const requestId = pick('x-request-id', 'x-requestid') || randomId('req');
  const traceId = pick('x-trace-id', 'x-traceid') || randomId('tr');
  lastRequestId = requestId;
  lastTraceId = traceId;
  return { requestId, traceId };
}

export function getLastOpTraceRequestId(): string | null {
  return lastRequestId;
}

export function getLastOpTraceTraceId(): string | null {
  return lastTraceId;
}

export type OpTraceLevel = 'debug' | 'info' | 'warn' | 'error';

const levelMap: Record<OpTraceLevel, LogLevel> = {
  debug: LogLevel.DEBUG,
  info: LogLevel.INFO,
  warn: LogLevel.WARN,
  error: LogLevel.ERROR
};

/**
 * Logs locally with a stable `event` field; does not call the server OpTrace API.
 */
export function optraceLog(
  level: OpTraceLevel,
  event: string,
  msg: string,
  attrs?: Record<string, unknown>
): void {
  const lv = levelMap[level] ?? LogLevel.INFO;
  const payload = { event, ...(attrs && Object.keys(attrs).length ? { attrs } : {}) };
  if (lv === LogLevel.DEBUG) logger.debug(msg, payload);
  else if (lv === LogLevel.INFO) logger.info(msg, payload);
  else if (lv === LogLevel.WARN) logger.warn(msg, payload);
  else logger.error(msg, payload);

  if (!isClientOpTraceBatchEnabled()) return;
  OPTRACE_BUFFER.push({
    level,
    event,
    msg,
    attrs,
    ts_ms: Date.now(),
  });
  if (OPTRACE_BUFFER.length >= OPTRACE_BATCH_MAX) {
    void flushOpTraceBatch();
  } else {
    scheduleOpTraceFlush();
  }
}
