import type { TelegramNotificationKind } from '../../../shared/telegramNotificationKinds';

export const telegramNotificationOptions: Array<{
  kind: TelegramNotificationKind;
  label: string;
  description: string;
  preview: string;
}> = [
  {
    kind: 'humanEscalation',
    label: 'Human escalation',
    description: 'When the agent asks for human help.',
    preview: '🚨 Human escalation\n\nSupport Agent needs attention.\n\nOpen: https://app.kilobot.app/inbox/…',
  },
  {
    kind: 'bookingCreated',
    label: 'New booking',
    description: 'When a customer books an appointment.',
    preview: '📅 New booking\n\nSupport Agent\n\nOpen: https://app.kilobot.app/calendar?eventId=…',
  },
  {
    kind: 'bookingUpdated',
    label: 'Booking updated',
    description: 'When an appointment is changed.',
    preview: '📅 Booking updated\n\nSupport Agent\n\nOpen: https://app.kilobot.app/calendar?eventId=…',
  },
  {
    kind: 'bookingCancelled',
    label: 'Booking cancelled',
    description: 'When an appointment is cancelled.',
    preview: '📅 Booking cancelled\n\nSupport Agent\n\nOpen: https://app.kilobot.app/calendar?eventId=…',
  },
];
