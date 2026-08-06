import { v } from 'convex/values';
import {
  TELEGRAM_NOTIFICATION_KINDS,
  type TelegramNotificationKind,
} from '../../shared/telegramNotificationKinds';

export const telegramNotificationKindValidator = v.union(
  v.literal('humanEscalation'),
  v.literal('bookingCreated'),
  v.literal('bookingUpdated'),
  v.literal('bookingCancelled'),
);

export const telegramNotificationKindsValidator = v.array(telegramNotificationKindValidator);

export function notificationKindsForAgent(
  kinds: TelegramNotificationKind[] | undefined,
): TelegramNotificationKind[] {
  return kinds ?? [...TELEGRAM_NOTIFICATION_KINDS];
}

export function isNotificationKindEnabled(
  kinds: TelegramNotificationKind[] | undefined,
  kind: TelegramNotificationKind,
): boolean {
  return notificationKindsForAgent(kinds).includes(kind);
}
