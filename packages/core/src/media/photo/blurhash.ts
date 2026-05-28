/**
 * BlurHash from a downscaled bitmap (4×3 components).
 * Gene: `sdk.media.photo.blurhash.gen1`
 */

function hasOffscreen(): boolean {
  return typeof (globalThis as { OffscreenCanvas?: unknown }).OffscreenCanvas !== 'undefined';
}

export async function computeBlurHashFromBitmap(bmp: ImageBitmap): Promise<string | undefined> {
  try {
    const { encode } = await import('blurhash');
    const w = 32;
    const h = 32;
    let imageData: ImageData;
    if (hasOffscreen()) {
      const c = new OffscreenCanvas(w, h);
      const ctx = c.getContext('2d');
      if (!ctx) return undefined;
      ctx.drawImage(bmp, 0, 0, w, h);
      imageData = ctx.getImageData(0, 0, w, h);
    } else {
      if (typeof document === 'undefined') return undefined;
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      const ctx = c.getContext('2d');
      if (!ctx) return undefined;
      ctx.drawImage(bmp, 0, 0, w, h);
      imageData = ctx.getImageData(0, 0, w, h);
    }
    return encode(imageData.data, w, h, 4, 3);
  } catch {
    return undefined;
  }
}
