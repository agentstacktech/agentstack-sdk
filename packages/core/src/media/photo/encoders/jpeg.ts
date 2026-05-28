/**
 * High-quality JPEG via `@jsquash/jpeg` (MozJPEG build inside Squoosh codec).
 *
 * `opts.progressive` is forwarded as MozJPEG's `progressive` flag — produces
 * `0xFFC2` scans so the browser can paint lower-resolution passes first over
 * slow links (matches our `full` ladder spec in `presets.ts`).
 */

type MozOpts = {
  quality?: number;
  progressive?: boolean;
  /** MozJPEG internal — leave as default but accept for forward compat. */
  optimize_coding?: boolean;
};

let encodeFn: ((data: ImageData, opts?: MozOpts) => Promise<ArrayBuffer | Uint8Array>) | null = null;

export async function encodeJpegSquash(
  imageData: ImageData,
  quality01: number,
  opts: { progressive?: boolean } = {}
): Promise<Blob | null> {
  try {
    if (!encodeFn) {
      const mod = (await import('@jsquash/jpeg')) as unknown as {
        encode?: typeof encodeFn;
        default?: typeof encodeFn;
      };
      encodeFn = mod.encode ?? mod.default ?? null;
    }
    if (!encodeFn) return null;
    const buf = await encodeFn(imageData, {
      quality: Math.round(quality01 * 100),
      progressive: opts.progressive === true,
      optimize_coding: true,
    });
    const ab = buf instanceof ArrayBuffer ? buf : new Uint8Array(buf).buffer;
    return new Blob([ab], { type: 'image/jpeg' });
  } catch {
    return null;
  }
}
