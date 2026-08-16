import type { FieldType, ServiceFieldForm, ServiceForm } from '@/lib/serviceForm';

export type WizardSelectOption = {
  value: string;
  title: string;
  description?: string;
  meta?: string;
};

export const SERVICE_SECTION_COPY = {
  details: {
    title: 'Service details',
    subtitle: 'Name the appointment type the AI should offer in chat.',
  },
  timing: {
    title: 'Appointment duration',
    subtitle: 'Set how long appointments last and which times the AI should offer first.',
  },
  data: {
    title: 'Information collected',
    subtitle: 'Choose what your AI agent gathers in chat before preparing the booking.',
  },
  assignment: {
    title: 'Booking team',
    subtitle: 'Choose who can perform this service and how bookings are assigned.',
  },
} as const;

export const ASSIGNMENT_STRATEGY_OPTIONS: WizardSelectOption[] = [
  {
    value: 'conversation_owner',
    title: 'Conversation owner first',
    description: 'Assigns the booking to whoever is already handling the chat.',
  },
  {
    value: 'balanced',
    title: 'Balanced available teammate',
    description: 'Picks the teammate with the most open capacity right now.',
  },
  {
    value: 'round_robin',
    title: 'Round robin',
    description: 'Rotates bookings evenly across all available teammates.',
  },
  {
    value: 'specific_user',
    title: 'Specific teammate',
    description: 'Always assigns bookings to one chosen team member.',
  },
];

export const CUSTOM_FIELD_TYPE_OPTIONS: WizardSelectOption[] = [
  { value: 'text', title: 'Text', description: 'Free-form text answer.' },
  { value: 'number', title: 'Number', description: 'Numeric value only.' },
  { value: 'select', title: 'Select', description: 'Choose from a list of options.' },
  { value: 'boolean', title: 'Yes / No', description: 'Simple yes or no answer.' },
];

export const EMPTY_FIELD_DRAFT: ServiceFieldForm = {
  key: '',
  label: '',
  type: 'text',
  optionsText: '',
};

export type FieldSuggestion = { id: string; label: string; type: FieldType };

const CUSTOM_FIELD_SUGGESTIONS: Array<{ label: string; type: FieldType }> = [
  { label: 'Email', type: 'text' },
  { label: 'Company', type: 'text' },
  { label: 'Special requests', type: 'text' },
];

export function getAvailableFieldSuggestions(form: ServiceForm): FieldSuggestion[] {
  return CUSTOM_FIELD_SUGGESTIONS.filter(
    (preset) => !form.fields.some(
      (item) => item.label.trim().toLowerCase() === preset.label.toLowerCase(),
    ),
  ).map((preset) => ({ id: `custom-${preset.label}`, ...preset }));
}
