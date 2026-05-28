import type { MessengerSwGetRegistration } from './messengerSwPostMessage';

export type ShowMessengerOsNotificationViaSwOptions = {
  getRegistration: MessengerSwGetRegistration;
  title: string;
  body: string;
  /** Deep link or in-app URL passed to ``notificationclick`` (``data.url``). */
  url: string;
  /** Stable dedupe tag (e.g. ``chat:hp:cid``). */
  tag: string;
  /** Echo server-push ``data`` shape for SW ``notificationclick`` handlers. */
  homeProjectId?: number;
  channelId?: string;
};

/**
 * When the tab is in the background, in-app toasts may be skipped — but users still expect a system notification.
 *
 * **If the user has an active PushSubscription**, the server already sends Web Push and the SW shows the real
 * notification; calling this would **duplicate** the OS alert. We only use this path when **there is no push
 * subscription** — e.g. permission granted but subscribe failed, or user cleared site data.
 *
 * Uses {@link ServiceWorkerRegistration.showNotification} so ``notificationclick`` is handled by the existing SW.
 */
export async function showMessengerOsNotificationViaSwWhenTabHidden(
  opts: ShowMessengerOsNotificationViaSwOptions
): Promise<void> {
  if (typeof window === 'undefined') return;
  if (typeof document !== 'undefined' && document.visibilityState !== 'hidden') return;
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  if (!('serviceWorker' in navigator)) return;

  const title = (opts.title || 'Messenger').trim().slice(0, 120);
  const body = (opts.body || 'New message').trim().slice(0, 500);
  const tag = String(opts.tag || '').trim();
  const url = String(opts.url || '').trim();
  if (!tag || !url) return;

  try {
    const reg = await opts.getRegistration();
    if (!reg?.showNotification) return;
    try {
      const sub = await reg.pushManager.getSubscription();
      if (sub) return;
    } catch {
      /* if getSubscription throws, still try fallback */
    }
    const data: Record<string, unknown> = { url };
    if (typeof opts.homeProjectId === 'number' && Number.isFinite(opts.homeProjectId)) {
      data.home_project_id = opts.homeProjectId;
    }
    if (opts.channelId != null && String(opts.channelId).trim() !== '') {
      data.channel_id = String(opts.channelId).trim();
    }
    const notificationOpts = {
      body,
      tag,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      renotify: true,
      silent: false,
      data,
    } as NotificationOptions;
    await reg.showNotification(title, notificationOpts);
  } catch {
    /* ignore — optional path */
  }
}
