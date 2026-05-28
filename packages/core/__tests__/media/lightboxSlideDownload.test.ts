import {
  lightboxSlideDownloadBasename,
  lightboxSlideDownloadUrl,
} from '../../src/media/lightboxSlideDownload';

describe('sdk.media.lightboxSlideDownload', () => {
  it('resolves url for image and video', () => {
    expect(lightboxSlideDownloadUrl({ kind: 'image', src: 'https://x/a.jpg' })).toBe(
      'https://x/a.jpg'
    );
    expect(lightboxSlideDownloadUrl({ kind: 'video', src: 'https://x/v.mp4', width: 1, height: 1 })).toBe(
      'https://x/v.mp4'
    );
    expect(lightboxSlideDownloadUrl({ kind: 'html', html: '', width: 1, height: 1 })).toBeNull();
  });

  it('prefers alt for basename', () => {
    expect(
      lightboxSlideDownloadBasename({
        kind: 'image',
        src: 'https://x/y.jpg',
        alt: 'My Vacation',
      })
    ).toBe('My Vacation');
  });
});
