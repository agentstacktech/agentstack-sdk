import { describe, expect, it } from 'vitest';

import { applyEdits, leafDigest } from '../applyEdits';

describe('applyEdits', () => {
  it('blocks merge that pastes a json view sketch onto a real object', () => {
    const report = applyEdits(
      { config: { theme: 'dark', count: 3 } },
      [{ op: 'merge', path: 'config', value: { theme: { t: 'string', keys: {} } } }],
    );
    expect(report.ok).toBe(false);
    expect(report.error_code).toBe('content_shrink_blocked');
  });

  it('merges and search_replaces on a dict root', () => {
    const report = applyEdits(
      { a: 1, text: 'hello world' },
      [
        { op: 'merge', path: '', value: { b: 2 } },
        {
          op: 'search_replace',
          path: 'text',
          replacements: [{ find: 'world', replace: 'there' }],
        },
      ],
    );
    expect(report.ok).toBe(true);
    expect(report.value).toEqual({ a: 1, b: 2, text: 'hello there' });
  });

  it('fails closed on replacement_not_found', () => {
    const report = applyEdits({ text: 'x' }, [
      { op: 'search_replace', path: 'text', replacements: [{ find: 'y', replace: 'z' }] },
    ]);
    expect(report.ok).toBe(false);
    expect(report.error_code).toBe('replacement_not_found');
  });

  it('leafDigest is stable for objects', () => {
    expect(leafDigest({ k: 1 })).toBe(leafDigest({ k: 1 }));
  });

  it('deletes a nested key', () => {
    const report = applyEdits({ a: 1, nested: { x: 9 } }, [{ op: 'delete', path: 'nested.x' }]);
    expect(report.ok).toBe(true);
    expect((report.value as { nested: { x?: number } }).nested.x).toBeUndefined();
  });

  it('applies strict unified_diff on a string leaf', () => {
    const diff = `--- a
+++ b
@@ -1,2 +1,2 @@
 line1
-old
+new
 line3`;
    const report = applyEdits(
      { body: 'line1\nold\nline3' },
      [{ op: 'unified_diff', path: 'body', unified_diff: diff, strict_diff: true }],
    );
    expect(report.ok).toBe(true);
    expect((report.value as { body: string }).body).toBe('line1\nnew\nline3');
  });

  it('insert_at appends into a list leaf', () => {
    const report = applyEdits(
      { items: ['a', 'c'] },
      [{ op: 'insert_at', path: 'items', at: 1, value: 'b' }],
    );
    expect(report.ok).toBe(true);
    expect((report.value as { items: string[] }).items).toEqual(['a', 'b', 'c']);
  });

  it('append extends a string leaf', () => {
    const report = applyEdits({ body: 'hi' }, [{ op: 'append', path: 'body', value: '!' }]);
    expect(report.ok).toBe(true);
    expect((report.value as { body: string }).body).toBe('hi!');
  });

  it('moves a list item by uid', () => {
    const report = applyEdits(
      { items: [{ uid: 'a' }, { uid: 'b' }, { uid: 'c' }] },
      [{ op: 'move', path: 'items', uid: 'c', before_uid: 'a' }],
    );
    expect(report.ok).toBe(true);
    const uids = (report.value as { items: Array<{ uid: string }> }).items.map((x) => x.uid);
    expect(uids).toEqual(['c', 'a', 'b']);
  });

  it('upserts keyed list rows', () => {
    const report = applyEdits(
      { items: [{ uid: 'a', n: 1 }, { uid: 'b', n: 2 }] },
      [{ op: 'upsert', path: 'items', value: [{ uid: 'a', n: 9 }, { uid: 'c', n: 3 }] }],
    );
    expect(report.ok).toBe(true);
    const items = (report.value as { items: Array<{ uid: string; n: number }> }).items;
    expect(items.map((x) => x.uid)).toEqual(['a', 'b', 'c']);
    expect(items.find((x) => x.uid === 'a')?.n).toBe(9);
  });

  it('missing skip skips replacement_not_found', () => {
    const report = applyEdits(
      { text: 'hello' },
      [
        { op: 'search_replace', path: 'text', replacements: [{ find: 'nope', replace: 'x' }] },
        { op: 'set', path: 'text', value: 'ok' },
      ],
      { missing: 'skip' },
    );
    expect(report.ok).toBe(true);
    expect(report.skipped).toBe(1);
    expect(report.applied).toBe(1);
    expect((report.value as { text: string }).text).toBe('ok');
  });
});
