/**
 * Pure list helpers for optimistic UI updates (no React).
 *
 * @example
 * ```ts
 * const next = appendOptimistically(projects, { id: 'temp-1', name: 'Draft' });
 * ```
 */

export type WithId = { id: string | number };

/**
 * Append or replace-by-id (dedupe) when the same id already exists.
 */
export function appendOptimistically<T extends WithId>(
  list: T[],
  item: T,
  prepend = true
): T[] {
  const id = item.id;
  const exists = list.some((x) => x.id === id);
  if (exists) {
    return list.map((x) => (x.id === id ? item : x));
  }
  return prepend ? [item, ...list] : [...list, item];
}

/**
 * Patch the first item matching `id`, or return the list unchanged.
 */
export function updateOptimistically<T extends WithId>(
  list: T[],
  id: string | number,
  patch: Partial<T>
): T[] {
  return list.map((x) => (x.id === id ? { ...x, ...patch } : x));
}

/**
 * Remove the first item matching `id`.
 */
export function removeOptimistically<T extends WithId>(
  list: T[],
  id: string | number
): T[] {
  return list.filter((x) => x.id !== id);
}
