import { buildTargetHeaders } from '../../src/media/resumableUpload';

describe('buildTargetHeaders hosting', () => {
  it('sets hosting target headers with bucket and project', () => {
    const headers = buildTargetHeaders({
      target: 'hosting',
      projectId: 2,
      bucketId: 'bucket-xyz',
    });
    expect(headers['X-Upload-Target']).toBe('hosting');
    expect(headers['X-Upload-Bucket-Id']).toBe('bucket-xyz');
    expect(headers['X-Upload-Project-Id']).toBe('2');
  });
});
