/**
 * TanStack Query keys must be JSON-serializable (hashKey uses JSON.stringify).
 * AgentStackSDK is circular (billing.eventEmitter → sdk) — never embed it in keys.
 */

import { hashKey } from '@tanstack/react-query';

/** Detect SDK instance mistaken for projectId / options. */
export function isLikelyAgentStackSdk(value: unknown): boolean {
  if (value == null || typeof value !== 'object') return false;
  const o = value as Record<string, unknown>;
  return (
    typeof o.emit === 'function' &&
    typeof o.httpClient === 'object' &&
    o.httpClient != null &&
    typeof o.billing === 'object' &&
    o.billing != null
  );
}

/** AgentBilling submodule — circular via eventEmitter → sdk root. */
export function isLikelyAgentStackBillingModule(value: unknown): boolean {
  if (value == null || typeof value !== 'object') return false;
  const o = value as Record<string, unknown>;
  if (typeof o.getOverview === 'function' && o.eventEmitter != null) return true;
  if (typeof o.updateOverageConfig === 'function') return true;
  return false;
}

function isNonSerializableQueryKeyPart(value: unknown): boolean {
  return isLikelyAgentStackSdk(value) || isLikelyAgentStackBillingModule(value);
}

function hasCircularStructure(value: unknown, seen = new WeakSet<object>()): boolean {
  if (value == null || typeof value !== 'object') return false;
  if (seen.has(value)) return true;
  seen.add(value);
  if (Array.isArray(value)) {
    return value.some((item) => hasCircularStructure(item, seen));
  }
  return Object.values(value as Record<string, unknown>).some((part) =>
    hasCircularStructure(part, seen),
  );
}

/** Coerce route scope ids for query keys — rejects SDK objects. */
export function coerceProjectIdKeyPart(projectId: unknown, label = 'projectId'): number {
  if (isNonSerializableQueryKeyPart(projectId)) {
    throw new Error(
      `queryKey: AgentStack SDK passed as ${label} — use a numeric project id in query keys`,
    );
  }
  const n = typeof projectId === 'number' ? projectId : Number(projectId);
  if (!Number.isFinite(n) || n < 0) return 0;
  return n;
}

/** Stable primitive / JSON string for object slices in query keys. */
export function stableKeyPart(value: unknown): string | number | boolean | null {
  if (value == null) return null;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }
  if (isNonSerializableQueryKeyPart(value)) {
    throw new Error('queryKey: AgentStack SDK instance is not serializable');
  }
  if (typeof value !== 'object') return String(value);
  if (Array.isArray(value)) {
    return JSON.stringify(value.map((item) => stableKeyPart(item)));
  }
  const obj = value as Record<string, unknown>;
  const normalized: Record<string, unknown> = {};
  for (const key of Object.keys(obj).sort()) {
    const part = obj[key];
    if (part !== undefined) normalized[key] = stableKeyPart(part);
  }
  return JSON.stringify(normalized);
}

function walkQueryKeyParts(key: readonly unknown[], path: string): void {
  for (let i = 0; i < key.length; i++) {
    const part = key[i];
    const partPath = `${path}[${i}]`;
    if (isNonSerializableQueryKeyPart(part)) {
      throw new Error(
        `queryKey${partPath}: AgentStack SDK must not appear in TanStack query keys`,
      );
    }
    if (part != null && typeof part === 'object') {
      if (hasCircularStructure(part)) {
        throw new Error(`queryKey${partPath}: circular or non-serializable query key`);
      }
      if (Array.isArray(part)) {
        walkQueryKeyParts(part as readonly unknown[], `${partPath}`);
      } else {
        walkQueryKeyParts([...Object.values(part)], `${partPath}`);
      }
    }
  }
}

/** TanStack default — assert then hash (use as QueryClient `queryKeyHashFn`). */
export function safeQueryKeyHashFn(queryKey: readonly unknown[]): string {
  assertSerializableQueryKey(queryKey);
  return hashKey(queryKey);
}

/** Fail fast before TanStack hashKey → JSON.stringify circular error. */
export function assertSerializableQueryKey(key: string | readonly unknown[]): void {
  if (typeof key === 'string') {
    if (isLikelyAgentStackSdk(key)) {
      throw new Error('queryKey: AgentStack SDK must not be used as query key string');
    }
    return;
  }
  if (isLikelyAgentStackSdk(key)) {
    throw new Error('queryKey: AgentStack SDK must not be used as query key');
  }
  walkQueryKeyParts(key, '');
  try {
    JSON.stringify(key);
  } catch {
    throw new Error('queryKey: circular or non-serializable query key');
  }
}

export function normalizeQueryKey(key: string | readonly unknown[]): readonly unknown[] {
  assertSerializableQueryKey(key);
  return Array.isArray(key) ? key : [key];
}
