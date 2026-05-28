/**
 * Snapshot cache key contract (Phase 0).
 *
 * Single string keys: `{namespace}:{id}` or `{namespace}:{scope}:{id}`.
 * Align React Query keys with repository keys via the frontend bridge
 * (`entitySnapshotRepositoryBridge.ts`).
 *
 * **Meta:** every snapshot carries `SnapshotMeta` with `fetchedAt` (ms epoch),
 * optional `revision` (etag / version / `timestamp` from API), optional `source`.
 * On conflict or unknown freshness, prefer `invalidate` / `invalidatePrefix` over TTL guessing.
 *
 * ## v1 snapshot kinds
 * - `project-data` — full project JSON workspace (`project_data`, `project_config`, …).
 * - `field-access-policy` — FAP payload per project.
 * - `blob` — arbitrary JSON blob (`blob:{opaqueId}`).
 * - `protein-data` — last successful `useProteinDataSystem` query per project + query fingerprint (`protein-data:{projectId}:{fp}`).
 *
 * ## Frontend duplication inventory (flatten / path / local memo)
 * 1. `agentstack-frontend/.../project-data/projectDataPaths.ts` — `getValueAtPath`, `flattenProjectData`, path suggestions (canonical copy now in SDK `data-paths.ts`).
 * 2. `agentstack-frontend/src/hooks/useProjectDataWorkspace.ts` — React Query keys `['project-data', id]`, `['field-access-policy', id]` (bridge maps to repository keys).
 * 3. Field-access policy widgets / pickers — same path helpers; consume SDK + repository after sync.
 * 4. Dashboard project-data widget — uses `projectDataPaths`; sync snapshot from query success.
 * 5. Mutations: `usePatchProjectData`, `usePutFieldAccessResourceMutation` — invalidate Query + call `invalidatePrefixes` on repository (see bridge).
 * 6. `cacheInvalidation.ts` — query prefixes; bridge maps `['project-data']` → `snapshotKeyPrefixProjectData()`.
 * 7–10. Any screen that `useMemo(() => flatten…)` for the same JSON tree should use `getOrBuildPathIndex` / `getAtPath` on the repository copy after sync.
 */

/** Namespace segment for project workspace JSON (key: `project-data:{projectId}`). */
export const SNAPSHOT_NS_PROJECT_DATA = 'project-data' as const;

/** Namespace for field access policy snapshot (`field-access-policy:{projectId}`). */
export const SNAPSHOT_NS_FIELD_ACCESS_POLICY = 'field-access-policy' as const;

/** Namespace prefix for arbitrary blobs (`blob:{opaqueId}`). */
export const SNAPSHOT_NS_BLOB = 'blob' as const;

/** React Query protein-data rows mirrored into the entity snapshot repository. */
export const SNAPSHOT_NS_PROTEIN_DATA = 'protein-data' as const;

/** Stable short fingerprint for a protein query key tail (entity, path, filters, …). */
export function proteinDataQueryFingerprint(queryKeyTail: unknown[]): string {
  const s = JSON.stringify(queryKeyTail);
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(36);
}

export function snapshotKeyProteinData(projectId: number, queryKeyTail: unknown[]): string {
  return `${SNAPSHOT_NS_PROTEIN_DATA}:${projectId}:${proteinDataQueryFingerprint(queryKeyTail)}`;
}

/** Invalidate every protein-data snapshot for a project (after mutations). */
export function snapshotKeyPrefixProteinDataForProject(projectId: number): string {
  return `${SNAPSHOT_NS_PROTEIN_DATA}:${projectId}:`;
}

export function snapshotKeyPrefixProteinDataAll(): string {
  return `${SNAPSHOT_NS_PROTEIN_DATA}:`;
}

export function snapshotKeyProjectData(projectId: number): string {
  return `${SNAPSHOT_NS_PROJECT_DATA}:${projectId}`;
}

export function snapshotKeyFieldAccessPolicy(projectId: number): string {
  return `${SNAPSHOT_NS_FIELD_ACCESS_POLICY}:${projectId}`;
}

export function snapshotKeyBlob(opaqueId: string): string {
  return `${SNAPSHOT_NS_BLOB}:${opaqueId}`;
}

/** Repository invalidate pattern: all project-data snapshots. */
export function snapshotKeyPrefixProjectData(): string {
  return `${SNAPSHOT_NS_PROJECT_DATA}:`;
}

export function snapshotKeyPrefixFieldAccessPolicy(): string {
  return `${SNAPSHOT_NS_FIELD_ACCESS_POLICY}:`;
}

export function snapshotKeyPrefixBlob(): string {
  return `${SNAPSHOT_NS_BLOB}:`;
}
