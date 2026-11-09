/**
 * Knowledge content.patch CAS helpers (mirror projectDataPatchUx / knowledge_patch_preview.py).
 * Gene: core.knowledge.hub.gen1 · sdk.knowledge.gen1
 */

import type {
  KnowledgeContentPatchBody,
  KnowledgeContentPatchResponse,
} from '../modules/AgentKnowledge';

export function commitDigestFromKnowledgePreview(
  res: KnowledgeContentPatchResponse,
): string | undefined {
  const prev = res.previous_sha256?.trim();
  if (prev) return prev;
  return res.leaf_sha256?.trim() || undefined;
}

/** Build commit body after dry_run; overlay draft so post-preview edits keep CAS. */
export function commitBodyFromKnowledgePreview(
  preview: KnowledgeContentPatchResponse,
  draft: KnowledgeContentPatchBody,
): KnowledgeContentPatchBody {
  const raw = preview.next_actions?.[0]?.params;
  const digest =
    commitDigestFromKnowledgePreview(preview) ?? draft.expected_sha256?.trim() ?? undefined;
  if (raw && typeof raw === 'object') {
    const params = raw as Record<string, unknown>;
    const { project_id: _p, dry_run: _d, source_doc_id: _s, collection_id: _c, patch, ...rest } =
      params;
    const fromPatch =
      patch && typeof patch === 'object' ? (patch as Record<string, unknown>) : {};
    return {
      ...fromPatch,
      ...rest,
      ...draft,
      ...(digest ? { expected_sha256: digest } : {}),
      dry_run: false,
    } as KnowledgeContentPatchBody;
  }
  if (digest) {
    return { ...draft, expected_sha256: digest, dry_run: false };
  }
  return { ...draft, dry_run: false };
}

export function formatKnowledgeContentPreviewSummary(
  res: KnowledgeContentPatchResponse,
): string {
  const lines = [
    res.dry_run ? 'dry_run: true (no re-embed)' : undefined,
    res.previous_sha256
      ? `previous_sha256: ${res.previous_sha256} (use as expected_sha256 on commit)`
      : undefined,
    res.leaf_sha256 ? `leaf_sha256: ${res.leaf_sha256}` : undefined,
    res.write_mode ? `write_mode: ${res.write_mode}` : undefined,
    res.next_actions?.[0]
      ? `next: ${res.next_actions[0].action} (expected_sha256 in preview)`
      : undefined,
  ].filter(Boolean);
  return lines.join('\n');
}
