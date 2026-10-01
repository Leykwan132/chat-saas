import type { TelegramNotificationKind } from '../../../shared/telegramNotificationKinds';
import {
  bookingSampleMessage,
  humanEscalationSampleMessage,
} from '../../../shared/telegramNotificationMessages';

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
    preview: humanEscalationSampleMessage(),
  },
  {
    kind: 'bookingCreated',
    label: 'New booking',
    description: 'When a customer books an appointment.',
    preview: bookingSampleMessage('New booking'),
  },
  {
    kind: 'bookingUpdated',
    label: 'Booking updated',
    description: 'When an appointment is changed.',
    preview: bookingSampleMessage('Booking updated'),
  },
  {
    kind: 'bookingCancelled',
    label: 'Booking cancelled',
    description: 'When an appointment is cancelled.',
    preview: bookingSampleMessage('Booking cancelled'),
  },
];
