import { describe, expect, it } from 'vitest';
import {
  commitBodyFromKnowledgePreview,
  commitDigestFromKnowledgePreview,
} from '../knowledgePatch';

describe('knowledgePatch', () => {
  it('commitDigestFromKnowledgePreview prefers previous_sha256', () => {
    expect(
      commitDigestFromKnowledgePreview({
        ok: true,
        previous_sha256: 'a',
        leaf_sha256: 'b',
      }),
    ).toBe('a');
  });

  it('commitBodyFromKnowledgePreview merges next_actions', () => {
    const body = commitBodyFromKnowledgePreview(
      {
        ok: true,
        dry_run: true,
        previous_sha256: 'cas',
        next_actions: [
          {
            action: 'knowledge.content.patch',
            params: {
              source_doc_id: 'doc-1',
              expected_sha256: 'cas',
              dry_run: false,
              patch: { replacements: [{ find: 'x', replace: 'y' }] },
            },
          },
        ],
      },
      { replacements: [{ find: 'x', replace: 'z' }] },
    );
    expect(body.dry_run).toBe(false);
    expect(body.expected_sha256).toBe('cas');
    expect(body.replacements?.[0]?.replace).toBe('z');
  });
});
