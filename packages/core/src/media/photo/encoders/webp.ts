/** Lazy WebP encode via @jsquash/webp (peer) or canvas fallback. */

let encodeFn:
  | ((data: ImageData, opts?: { quality?: number }) => Promise<ArrayBuffer | Uint8Array>)
  | null = null;

export async function encodeWebpJsquash(imageData: ImageData, quality01: number): Promise<Blob | null> {
  try {
    if (!encodeFn) {
      const mod = (await import('@jsquash/webp')) as unknown as {
        encode?: (data: ImageData, opts?: { quality?: number }) => Promise<ArrayBuffer>;
        default?: (data: ImageData, opts?: { quality?: number }) => Promise<ArrayBuffer>;
      };
      encodeFn = mod.encode ?? mod.default ?? null;
    }
    if (!encodeFn) return null;
    const buf = await encodeFn(imageData, { quality: Math.round(quality01 * 100) });
    const ab = buf instanceof ArrayBuffer ? buf : new Uint8Array(buf).buffer;
    return new Blob([ab], { type: 'image/webp' });
  } catch {
    return null;
  }
}
