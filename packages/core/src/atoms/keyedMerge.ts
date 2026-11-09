/**
 * Port of shared/atoms/keyed_merge.py — gene shared.atoms.keyed_merge.gen1
 */

function itemKey(
  item: unknown,
  primary = 'uid',
  fallbacks: string[] = ['id', 'key'],
): string | null {
  if (!item || typeof item !== 'object' || Array.isArray(item)) return null;
  const rec = item as Record<string, unknown>;
  for (const k of [primary, ...fallbacks]) {
    const v = rec[k];
    if (v !== undefined && v !== null && String(v) !== '') return String(v);
  }
  return null;
}

export function deepMergeKeyed(
  a: Record<string, unknown>,
  b: Record<string, unknown>,
  listKey = 'uid',
): Record<string, unknown> {
  const result: Record<string, unknown> = { ...a };
  for (const [key, value] of Object.entries(b)) {
    const existing = result[key];
    if (existing && typeof existing === 'object' && !Array.isArray(existing) && value && typeof value === 'object' && !Array.isArray(value)) {
      result[key] = deepMergeKeyed(existing as Record<string, unknown>, value as Record<string, unknown>, listKey);
    } else if (
      Array.isArray(existing) &&
      Array.isArray(value) &&
      existing.length &&
      value.length &&
      existing.every((x) => itemKey(x, listKey)) &&
      value.every((x) => itemKey(x, listKey))
    ) {
      result[key] = mergeListByKey(existing, value, listKey);
    } else {
      result[key] = value;
    }
  }
  return result;
}

export function mergeListByKey(left: unknown[], right: unknown[], primary = 'uid'): unknown[] {
  if (!left.length) return [...right];
  if (!right.length) return [...left];
  const leftKeys = left.map((i) => itemKey(i, primary));
  const rightKeys = right.map((i) => itemKey(i, primary));
  if (leftKeys.some((k) => !k) || rightKeys.some((k) => !k)) {
    return [...right];
  }
  const index = new Map<string, number>();
  const result: unknown[] = [];
  for (const item of left) {
    const k = itemKey(item, primary)!;
    index.set(k, result.length);
    result.push(item);
  }
  for (const item of right) {
    const k = itemKey(item, primary)!;
    const pos = index.get(k);
    if (pos !== undefined) {
      const existing = result[pos];
      if (existing && typeof existing === 'object' && !Array.isArray(existing) && item && typeof item === 'object' && !Array.isArray(item)) {
        result[pos] = deepMergeKeyed(existing as Record<string, unknown>, item as Record<string, unknown>, primary);
      } else {
        result[pos] = item;
      }
    } else {
      index.set(k, result.length);
      result.push(item);
    }
  }
  return result;
}
