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
    preview: '🚨 Human escalation\n\nAgent: Support Agent\nCustomer: Sample Customer\nContact: sample@example.com\nLatest message: I need help with my booking.\nNeeds help: Please review the customer request.\n\nOpen: https://app.kilobot.app/inbox/…',
  },
  {
    kind: 'bookingCreated',
    label: 'New booking',
    description: 'When a customer books an appointment.',
    preview: '📅 New booking\n\nAgent: Support Agent\nBooking: Consultation - Sample Customer\nDate: August 6 (Thursday)\nTime: 10:00 AM - 10:30 AM (Asia/Kuala_Lumpur)\nCustomer: Sample Customer <sample@example.com>\nService: Consultation\nStatus: Confirmed\n\nOpen: https://app.kilobot.app/calendar?eventId=…',
  },
  {
    kind: 'bookingUpdated',
    label: 'Booking updated',
    description: 'When an appointment is changed.',
    preview: '📅 Booking updated\n\nAgent: Support Agent\nBooking: Consultation - Sample Customer\nDate: August 6 (Thursday)\nTime: 10:00 AM - 10:30 AM (Asia/Kuala_Lumpur)\nCustomer: Sample Customer <sample@example.com>\nService: Consultation\nStatus: Updated\n\nOpen: https://app.kilobot.app/calendar?eventId=…',
  },
  {
    kind: 'bookingCancelled',
    label: 'Booking cancelled',
    description: 'When an appointment is cancelled.',
    preview: '📅 Booking cancelled\n\nAgent: Support Agent\nBooking: Consultation - Sample Customer\nDate: August 6 (Thursday)\nTime: 10:00 AM - 10:30 AM (Asia/Kuala_Lumpur)\nCustomer: Sample Customer <sample@example.com>\nService: Consultation\nStatus: Cancelled\n\nOpen: https://app.kilobot.app/calendar?eventId=…',
  },
];
