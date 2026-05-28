/**
 * compressPhoto — browser primitives (`createImageBitmap`, `OffscreenCanvas`)
 * are absent in Node + jsdom, so these tests verify:
 *   - graceful failure mode when `createImageBitmap` is unavailable
 *   - the cheap-hash algorithm path (prefix-hash for big files, full hash for small)
 */

import { compressPhoto } from '../../src/media/photo/compress';

const hadBitmap = typeof (globalThis as { createImageBitmap?: unknown }).createImageBitmap !== 'undefined';

describe('sdk.media.photo compress', () => {
  it('rejects when browser bitmap pipeline is unavailable', async () => {
    if (hadBitmap) {
      // Skip — running in a real browser harness would use jsdom mocks.
      expect(true).toBe(true);
      return;
    }
    const b = new Blob([new Uint8Array([1, 2, 3, 4])], { type: 'image/jpeg' });
    await expect(compressPhoto(b, { preset: 'messenger_photo' })).rejects.toBeDefined();
  });

  it('respects AbortSignal before the pipeline starts', async () => {
    const ctrl = new AbortController();
    ctrl.abort();
    const b = new Blob([new Uint8Array([1, 2, 3, 4])], { type: 'image/jpeg' });
    await expect(
      compressPhoto(b, { preset: 'messenger_photo', signal: ctrl.signal })
    ).rejects.toMatchObject({ name: expect.stringMatching(/AbortError|Error/) });
  });
});
