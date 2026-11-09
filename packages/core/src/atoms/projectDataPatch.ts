/**
 * Project data patch CAS helpers (mirror knowledgePatch / projects_patch_preview.py).
 * Gene: sdk.protocol.gen1 · shared.atoms.directed_edit.gen1
 */

import type {
  PatchProjectDataBody,
  PatchProjectDataResponse,
} from '../types/entities/Project';

export function commitDigestFromPreview(
  res: PatchProjectDataResponse,
): string | undefined {
  const prev = res.previous_sha256?.trim();
  if (prev) return prev;
  return res.leaf_sha256?.trim() || undefined;
}

/** Build commit body after dry_run; overlay draft so post-preview edits keep CAS. */
export function commitBodyFromPreview(
  preview: PatchProjectDataResponse,
  draft: PatchProjectDataBody,
): PatchProjectDataBody {
  const raw = preview.next_actions?.[0]?.params;
  const digest =
    commitDigestFromPreview(preview) ?? draft.expected_sha256?.trim() ?? undefined;
  if (raw && typeof raw === 'object') {
    const { project_id: _pid, dry_run: _dry, ...fromAction } = raw as Record<
      string,
      unknown
    >;
    return {
      ...fromAction,
      ...draft,
      ...(digest ? { expected_sha256: digest } : {}),
      dry_run: false,
    } as PatchProjectDataBody;
  }
  if (digest) {
    return { ...draft, expected_sha256: digest, dry_run: false };
  }
  return { ...draft, dry_run: false };
}

export function formatProjectDataPreviewSummary(res: PatchProjectDataResponse): string {
  const prev = res.previous_sha256;
  const lines = [
    res.dry_run ? 'dry_run: true (no persist)' : undefined,
    prev ? `previous_sha256: ${prev} (use as expected_sha256 on commit)` : undefined,
    res.leaf_sha256 ? `leaf_sha256: ${res.leaf_sha256}` : undefined,
    res.write?.mode ? `write.mode: ${res.write.mode}` : undefined,
    res.write?.applied != null ? `applied: ${res.write.applied}` : undefined,
    res.write?.skipped != null ? `skipped: ${res.write.skipped}` : undefined,
    res.write?.methods?.length ? `methods: ${res.write.methods.join(', ')}` : undefined,
    res.next_actions?.[0]
      ? `next: ${res.next_actions[0].action} (expected_sha256 already in preview)`
      : undefined,
    res.writes?.length ? `writes: ${res.writes.length}` : undefined,
  ].filter(Boolean);
  return lines.join('\n');
}

export function effectiveWriteModeLabel(body: PatchProjectDataBody): string {
  if (body.write_mode) return body.write_mode;
  if (body.replacements?.length) return 'search_replace';
  if (body.ops?.length) return 'ops';
  return 'replace';
}
