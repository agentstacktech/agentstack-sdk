import { sanitizeDownloadFilename } from '../../src/media/browserDownload';

describe('sdk.media.browserDownload', () => {
  it('sanitizeDownloadFilename strips unsafe chars', () => {
    expect(sanitizeDownloadFilename('a/b:c')).toBe('a_b_c');
    expect(sanitizeDownloadFilename('   ')).toBe('download');
  });
});
