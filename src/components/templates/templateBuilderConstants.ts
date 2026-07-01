import type { ButtonType, TemplateLibraryPreset } from './templateBuilderTypes';

export const createTemplateSelectTriggerClass =
  'h-auto min-h-12 w-full justify-between rounded-lg border-border bg-input/50 px-4 py-3.5';

export const createTemplateSelectContentClass = 'w-[var(--radix-select-trigger-width)]';

export const createTemplateInputClass = 'h-12 border-border px-4 py-3';

export const BUTTON_TYPE_OPTIONS: ReadonlyArray<{
  value: ButtonType;
  label: string;
  description: string;
}> = [
  { value: 'QUICK_REPLY', label: 'Quick Reply', description: 'Simple response' },
  { value: 'URL', label: 'Visit URL', description: 'Open a link' },
  { value: 'PHONE_NUMBER', label: 'Call Phone', description: 'Call your number' },
  { value: 'COPY_CODE', label: 'Copy Code', description: 'Copy a code' },
];

export const TEMPLATE_LIBRARY_PRESETS: TemplateLibraryPreset[] = [
  {
    id: 'follow_up',
    name: 'follow_up_check_in',
    title: 'Follow-up',
    description: 'Re-open a quiet customer conversation.',
    category: 'marketing',
    headerText: 'Follow-up',
    bodyText:
      "Hi @customer_name,\n\nJust checking in on your recent request.\n\nWould you still be interested in moving forward?\n\nReply here and our team will help with the next step.",
    buttons: [{ type: 'QUICK_REPLY', text: 'Send me more info!' }],
  },
  {
    id: 'reminder',
    name: 'appointment_reminder',
    title: 'Reminder',
    description: 'Remind customers about a booked appointment.',
    category: 'utility',
    headerText: 'Appointment Reminder',
    bodyText:
      'Dear @customer_name,\n\nThis is a reminder of your upcoming @booking_service appointment.\n\nDate: @booking_date\nTime: @booking_time\n\nIf you need to make any changes, please reply to this message and our team will assist you.',
    buttons: [{ type: 'QUICK_REPLY', text: 'Got it! Thanks!' }],
  },
  {
    id: 'broadcast',
    name: 'customer_broadcast_update',
    title: 'Broadcast',
    description: 'Send a personalized update to many customers.',
    category: 'marketing',
    headerText: 'Limited-Time Offer',
    bodyText:
      'Hi @customer_name,\n\nA special offer is waiting for you.\n\nEnjoy our latest promotion for a limited time.\n\nReply here to claim the offer or learn more.',
    buttons: [{ type: 'QUICK_REPLY', text: "I'm interested" }],
  },
];
