/**
 * User-scoped messaging SDK (`sdk.messaging.user` alias).
 * Genetic tag: `sdk.messaging.gen1`
 */
export type {
  BotCandidateRow,
  CorrelationDeliveryStatus,
  DeliveryReceiptRow,
  NotificationDeliveryStatus,
  NotificationPrefsSnapshot,
  NotificationPrefsWrite,
  NotificationSourceHealth,
  NotificationSourceRow,
  NotifyCategoryId,
  NotifyCategoryPref,
  PlatformTelegramHint,
  SourceKind,
} from './notificationPrefs';

export type { DeliverNotificationParams, DeliverNotificationResult } from './deliver';

export {
  CHANNEL_ALIASES,
  NOTIFY_CATEGORIES,
  SOURCE_KINDS,
  deleteNotificationSource,
  getDeliveryStatus,
  getDeliveryStatusByCorrelationKey,
  getNotificationSourceHealth,
  getNotificationPrefsSnapshot,
  listFailedDeliveries,
  putNotificationPrefs,
  putNotificationSource,
} from './notificationPrefs';

export { deliverNotification } from './deliver';
