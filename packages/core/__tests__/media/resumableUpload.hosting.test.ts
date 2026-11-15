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

  it('passes hosting ingress option headers', () => {
    const headers = buildTargetHeaders({
      target: 'hosting',
      projectId: 1,
      bucketId: 'b',
      hostingMode: 'replace',
      hostingStrip: 'auto',
      hostingPublish: true,
      hostingConfirmReplace: true,
      hostingConfirmPrune: true,
    });
    expect(headers['X-Upload-Hosting-Mode']).toBe('replace');
    expect(headers['X-Upload-Hosting-Publish']).toBe('true');
    expect(headers['X-Upload-Hosting-Confirm-Replace']).toBe('true');
    expect(headers['X-Upload-Hosting-Confirm-Prune']).toBe('true');
  });
});
