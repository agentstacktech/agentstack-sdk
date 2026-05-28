/**
 * Probe intrinsic pixel size of a remote image URL without inserting it into
 * the document. Used by lightbox callers to pass accurate `width`/`height`
 * to PhotoSwipe when metadata is missing.
 *
 * Resolves `null` on timeout / decode error / non-browser — never fabricates
 * fake dimensions (aspect deformation risk).
 */

export const DEFAULT_PROBE_IMAGE_NATURAL_TIMEOUT_MS = 750;

export function probeImageNaturalSize(
  src: string,
  options?: { timeoutMs?: number }
): Promise<{ width: number; height: number } | null> {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_PROBE_IMAGE_NATURAL_TIMEOUT_MS;
  return new Promise((resolve) => {
    if (typeof Image === 'undefined') {
      resolve(null);
      return;
    }
    let settled = false;
    const finish = (r: { width: number; height: number } | null) => {
      if (settled) return;
      settled = true;
      resolve(r);
    };
    const img = new Image();
    img.onload = () => {
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      if (w > 0 && h > 0) finish({ width: w, height: h });
      else finish(null);
    };
    img.onerror = () => finish(null);
    try {
      img.src = src;
    } catch {
      finish(null);
      return;
    }
    setTimeout(() => finish(null), timeoutMs);
  });
}
