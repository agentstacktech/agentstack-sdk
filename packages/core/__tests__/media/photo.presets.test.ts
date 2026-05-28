import { sizesForPreset, type PhotoSizeKey } from '../../src/media/photo/presets';

describe('sdk.media.photo presets', () => {
  it('messenger_photo ladder includes display avif + webp', () => {
    const s = sizesForPreset('messenger_photo');
    expect(s.display.formats).toContain('avif');
    expect(s.display.formats).toContain('webp');
    expect(s.thumb.formats).toContain('webp');
    expect(s.full.formats).toContain('jpeg');
  });

  it('defines all four size keys for each preset', () => {
    const keys: PhotoSizeKey[] = ['thumb', 'preview', 'display', 'full'];
    for (const preset of ['messenger_photo', 'storage_card', 'avatar'] as const) {
      const s = sizesForPreset(preset);
      for (const k of keys) {
        expect(s[k].maxEdge).toBeGreaterThan(0);
        expect(s[k].formats.length).toBeGreaterThan(0);
      }
    }
  });
});
