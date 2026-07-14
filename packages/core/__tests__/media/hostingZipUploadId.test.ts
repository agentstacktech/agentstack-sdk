import { describe, expect, it } from 'vitest';

import { buildHostingZipOpId, fingerprintHostingZipFile } from '../../src/media/hostingZipUploadId';

describe('hostingZipUploadId', () => {
  it('builds stable ids within server charset and length', () => {
    const file = { name: 'site.zip', size: 5_000_000, lastModified: 123 };
    const id = buildHostingZipOpId(2, 'bucket-abc', file);
    expect(id).toBe(buildHostingZipOpId(2, 'bucket-abc', file));
    expect(id.length).toBeLessThanOrEqual(64);
    expect(id).toMatch(/^hz-2-bucket-abc-/);
  });

  it('fingerprints file metadata', () => {
    const a = fingerprintHostingZipFile({ name: 'a.zip', size: 1, lastModified: 1 });
    const b = fingerprintHostingZipFile({ name: 'b.zip', size: 1, lastModified: 1 });
    expect(a).not.toBe(b);
  });
});
