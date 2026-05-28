/**
 * Minimal browser download helpers — fetch blob + `<a download>`, with
 * `window.open` fallback when CORS or opaque responses block blob access.
 *
 * Gene: `sdk.media.gen1` · consumer surfaces (lightbox menu, storage, chat).
 */

export function sanitizeDownloadFilename(name: string): string {
  const s = name.replace(/[/\\?%*:|"<>#]/g, '_').trim() || 'download';
  return s.length > 120 ? s.slice(0, 120) : s;
}

/**
 * Attempt same-origin / CORS-enabled download; otherwise opens URL in a new tab.
 */
export async function downloadUrlAsFile(
  url: string,
  filename: string,
  init?: RequestInit
): Promise<void> {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  const safe = sanitizeDownloadFilename(filename);
  try {
    const res = await fetch(url, {
      mode: 'cors',
      credentials: 'include',
      ...init,
    });
    if (!res.ok) throw new Error(`http_${res.status}`);
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = safe;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
  } catch {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}
