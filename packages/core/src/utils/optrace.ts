/**
 * OpTrace client facade: stable event ids + correlation ids for server ring buffers.
 * Server records English `msg` and structured `attrs`; client only sets headers and local logs.
 */

import { logger, LogLevel } from './logger';

let lastRequestId: string | null = null;
let lastTraceId: string | null = null;

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
}
