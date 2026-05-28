/** Build idempotency keys for economy writes (body field on server). */
export function economyIdempotencyKey(scope: string, stableId?: string): string {
  const suffix =
    stableId ??
    (typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`);
  return `${scope}:${suffix}`;
}
