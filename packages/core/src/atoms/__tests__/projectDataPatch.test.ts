import { describe, expect, it } from 'vitest';
import {
  commitBodyFromPreview,
  commitDigestFromPreview,
  formatProjectDataPreviewSummary,
} from '../projectDataPatch';

describe('projectDataPatch', () => {
  it('commitDigestFromPreview prefers previous_sha256', () => {
    expect(
      commitDigestFromPreview({
        success: true,
        project_id: 1,
        previous_sha256: 'abc',
        leaf_sha256: 'def',
      }),
    ).toBe('abc');
  });

  it('commitBodyFromPreview merges next_actions with draft', () => {
    const body = commitBodyFromPreview(
      {
        success: true,
        project_id: 1,
        previous_sha256: 'cas1',
        next_actions: [
          {
            action: 'projects.patch_data',
            params: {
              project_id: 1,
              path: 'config.x',
              value: 1,
              expected_sha256: 'cas1',
              dry_run: true,
            },
          },
        ],
      },
      { path: 'config.x', value: 2 },
    );
    expect(body.dry_run).toBe(false);
    expect(body.expected_sha256).toBe('cas1');
    expect(body.value).toBe(2);
    expect(body.path).toBe('config.x');
  });

  it('formatProjectDataPreviewSummary includes next_actions hint', () => {
    const text = formatProjectDataPreviewSummary({
      success: true,
      project_id: 1,
      dry_run: true,
      next_actions: [{ action: 'projects.patch_data', params: { path: 'a' } }],
    });
    expect(text).toContain('next:');
  });
});
