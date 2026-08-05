import type { TelegramNotificationKind } from '../../../shared/telegramNotificationKinds';

export const telegramNotificationOptions: Array<{
  kind: TelegramNotificationKind;
  label: string;
  description: string;
}> = [
  {
    kind: 'humanEscalation',
    label: 'Human escalation',
    description: 'When the agent asks for human help.',
  },
  {
    kind: 'bookingCreated',
    label: 'New booking',
    description: 'When a customer books an appointment.',
  },
  {
    kind: 'bookingUpdated',
    label: 'Booking updated',
    description: 'When an appointment is changed.',
  },
  {
    kind: 'bookingCancelled',
    label: 'Booking cancelled',
    description: 'When an appointment is cancelled.',
  },
];
