import { buildSyncDiff } from '../buildSyncDiff';

describe('buildSyncDiff', () => {
  it('skips when sha256 matches', () => {
    const local = new Map([
      ['a.js', { bytes: 10, sha256: 'abc' }],
    ]);
    const out = buildSyncDiff(local, [{ path: 'a.js', bytes: 10, sha256: 'abc' }]);
    expect(out.skip).toEqual(['a.js']);
    expect(out.upload).toEqual([]);
  });

  it('uploads on stat_fingerprint mismatch', () => {
    const local = new Map([
      ['big.bin', { bytes: 100, statFingerprint: 'old' }],
    ]);
    const out = buildSyncDiff(local, [
      { path: 'big.bin', bytes: 100, stat_fingerprint: 'new' },
    ]);
    expect(out.upload).toEqual(['big.bin']);
  });
});
