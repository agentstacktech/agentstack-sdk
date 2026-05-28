/** Lazy AVIF encode via `@jsquash/avif` (optional peer dependency). */

type AvifOpts = { quality?: number; speed?: number };

let encodeFn: ((data: ImageData, opts?: AvifOpts) => Promise<ArrayBuffer | Uint8Array>) | null = null;

export async function encodeAvif(imageData: ImageData, quality01: number): Promise<Blob | null> {
  try {
    if (!encodeFn) {
      const mod = (await import('@jsquash/avif')) as unknown as {
        encode?: typeof encodeFn;
        default?: typeof encodeFn;
      };
      encodeFn = mod.encode ?? mod.default ?? null;
    }
    if (!encodeFn) return null;
    const buf = await encodeFn(imageData, {
      quality: Math.round(quality01 * 100),
      // `6` = balanced; `0` slowest/best, `10` fastest. Matches Squoosh default.
      speed: 6,
    });
    const ab = buf instanceof ArrayBuffer ? buf : new Uint8Array(buf).buffer;
    return new Blob([ab], { type: 'image/avif' });
  } catch {
    return null;
  }
}
