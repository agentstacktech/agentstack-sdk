/**
 * Canonical URL/path normalization for ecosystem public profile avatars
 * (``POST /api/social/users/public-cards``, friend cards, messenger author cache).
 *
 * DNA may store storage-organ paths as ``storage/{project_id}/{user_id}/…`` (no
 * ``/uploaded_files`` prefix). Browsers must load them under the static mount
 * ``/uploaded_files/…`` (nginx + FileStorage).
 */

/** Expand stored avatar path to a path suitable for ``<img src>`` on the app origin. */
export function expandSocialAvatarPath(s: string): string {
  const t = s.trim();
  if (!t) return t;
  if (t.startsWith('data:')) return t;
  if (t.startsWith('http://') || t.startsWith('https://')) return t;
  if (t.startsWith('/uploaded_files/')) return t;
  if (t.startsWith('uploaded_files/')) return `/${t}`;
  const unlead = t.replace(/^\/+/, '');
  if (unlead.startsWith('storage/')) {
    return `/uploaded_files/${unlead}`;
  }
  if (t.startsWith('/')) return t;
  return `/uploaded_files/${t}`;
}

export type SocialPublicCardAvatar = { url: string };

/**
 * Normalize API ``avatar`` (string or ``{ url }``) to a single ``{ url }`` shape
 * with ``expandSocialAvatarPath`` applied, or ``null`` when absent.
 */
export function normalizeSocialPublicCardAvatar(raw: unknown): SocialPublicCardAvatar | null {
  if (raw == null) return null;
  if (typeof raw === 'string') {
    const u = raw.trim();
    if (!u) return null;
    return { url: expandSocialAvatarPath(u) };
  }
  if (typeof raw === 'object' && !Array.isArray(raw)) {
    const u = (raw as Record<string, unknown>).url;
    if (typeof u === 'string' && u.trim()) {
      return { url: expandSocialAvatarPath(u.trim()) };
    }
  }
  return null;
}
