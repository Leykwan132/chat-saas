import type { TelegramNotificationKind } from '../../../shared/telegramNotificationKinds';

export const telegramNotificationOptions: Array<{
  kind: TelegramNotificationKind;
  label: string;
  preview: string;
}> = [
  {
    kind: 'humanEscalation',
    label: 'Human escalation',
    preview: '🚨 Human escalation\n\nSupport Agent needs attention.\n\nOpen: https://app.kilobot.app/inbox/…',
  },
  {
    kind: 'bookingCreated',
    label: 'New booking',
    preview: '📅 New booking\n\nSupport Agent\n\nOpen: https://app.kilobot.app/calendar?eventId=…',
  },
  {
    kind: 'bookingUpdated',
    label: 'Booking updated',
    preview: '📅 Booking updated\n\nSupport Agent\n\nOpen: https://app.kilobot.app/calendar?eventId=…',
  },
  {
    kind: 'bookingCancelled',
    label: 'Booking cancelled',
    preview: '📅 Booking cancelled\n\nSupport Agent\n\nOpen: https://app.kilobot.app/calendar?eventId=…',
  },
];
