/**
 * Which workspace paths differ from hosting.sync.plan manifest (client-side).
 */

import type { HostingSyncPlanResult } from './deploySyncPlan';
import type { SyncDiffResult } from './buildSyncDiff';

export function workspacePathsToPush(
  workspacePaths: readonly string[],
  plan: HostingSyncPlanResult,
  diff: SyncDiffResult,
): string[] {
  const serverPaths = new Set((plan.files ?? []).map((f) => String(f.path || '').trim()).filter(Boolean));
  const uploadSet = new Set(diff.upload);
  const out: string[] = [];
  for (const path of workspacePaths) {
    const p = String(path || '').trim();
    if (!p) continue;
    if (!serverPaths.has(p) || uploadSet.has(p)) {
      out.push(p);
    }
  }
  return out;
}
