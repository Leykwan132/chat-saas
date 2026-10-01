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
  actions: string[];
}> = [
  {
    kind: 'humanEscalation',
    label: 'Human escalation',
    description: 'When the agent asks for human help.',
    preview: humanEscalationSampleMessage(),
    actions: ["Chat on WhatsApp"],
  },
  {
    kind: 'bookingCreated',
    label: 'New booking',
    description: 'When a customer books an appointment.',
    preview: bookingSampleMessage('New booking'),
    actions: ['Chat on WhatsApp', 'Add to Google Calendar'],
  },
  {
    kind: 'bookingUpdated',
    label: 'Booking updated',
    description: 'When an appointment is changed.',
    preview: bookingSampleMessage('Booking updated'),
    actions: ['Chat on WhatsApp'],
  },
  {
    kind: 'bookingCancelled',
    label: 'Booking cancelled',
    description: 'When an appointment is cancelled.',
    preview: bookingSampleMessage('Booking cancelled'),
    actions: ['Chat on WhatsApp'],
  },
];
