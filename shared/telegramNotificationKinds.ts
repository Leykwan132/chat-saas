export const TELEGRAM_NOTIFICATION_KINDS = [
  'humanEscalation',
  'bookingCreated',
  'bookingUpdated',
  'bookingCancelled',
] as const;

export type TelegramNotificationKind = (typeof TELEGRAM_NOTIFICATION_KINDS)[number];
