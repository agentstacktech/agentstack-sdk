/**
 * Derive download URL + suggested basename from a typed lightbox slide.
 * Keeps UI layers thin — same rules as the app overflow menu.
 */

import type { LightboxSlide } from './lightbox';
import { sanitizeDownloadFilename } from './browserDownload';

export function lightboxSlideDownloadUrl(slide: LightboxSlide | undefined): string | null {
  if (!slide) return null;
  if (slide.kind === 'image' || slide.kind === 'video') return slide.src;
  return null;
}

export function lightboxSlideDownloadBasename(slide: LightboxSlide | undefined): string {
  if (!slide) return 'download';
  const alt = typeof slide.alt === 'string' ? slide.alt.trim() : '';
  if (alt) return sanitizeDownloadFilename(alt);
  const url = lightboxSlideDownloadUrl(slide);
  if (url && typeof window !== 'undefined') {
    try {
      const u = new URL(url, window.location.href);
      const base = u.pathname.split('/').pop() || 'download';
      return sanitizeDownloadFilename(decodeURIComponent(base));
    } catch {
      return 'download';
    }
  }
  return 'download';
}
