import type { Id } from '../../convex/_generated/dataModel';
import {
  calendarTimeLabelToMinutes,
  minutesToCalendarTimeLabel,
} from '@/lib/calendarTimeUtils';

export type FieldType = 'text' | 'number' | 'select' | 'boolean' | 'date' | 'time' | 'phone';
export type SalesStyle = 'proactive' | 'neutral' | 'gentle';
export type AssignmentStrategy = 'conversation_owner' | 'balanced' | 'round_robin' | 'specific_user';
export type TeamMemberRole = 'owner' | 'admin' | 'member';

export type TeamUserOption = {
  value: string;
  name: string;
  roleLabel: string;
};

export function teamMemberRoleLabel(role: TeamMemberRole) {
  switch (role) {
    case 'owner':
      return 'Owner';
    case 'admin':
      return 'Admin';
    default:
      return 'Member';
  }
}

export type ServiceFieldForm = {
  key: string;
  label: string;
  type: FieldType;
  optionsText: string;
};

export const DEFAULT_SERVICE_FIELDS: ServiceFieldForm[] = [
  { key: 'date', label: 'Booking Date', type: 'date', optionsText: '' },
  { key: 'time', label: 'Booking Time', type: 'time', optionsText: '' },
  { key: 'name', label: 'Customer Name', type: 'text', optionsText: '' },
  { key: 'phone', label: 'Phone Number', type: 'phone', optionsText: '' },
];

export type ServiceForm = {
  name: string;
  description: string;
  isActive: boolean;
  durationMinutes: number;
  bufferMinutes: number;
  timeZone: string;
  fields: ServiceFieldForm[];
  preferredTimeEnabled: boolean;
  preferredTimes: string[];
  salesStyle: SalesStyle;
  assignmentStrategy: AssignmentStrategy;
  specificWorkosUserId: string;
};

export type ServiceRow = {
  _id: Id<'appointmentServices'>;
  name: string;
  description?: string;
  isActive: boolean;
  bookingCount?: number;
  sortOrder: number;
  durationMinutes: number;
  bufferMinutes?: number;
  timeZone?: string;
  fields: Array<{
    key: string;
    label: string;
    type: FieldType;
    options?: string[];
  }>;
  preferredTimeMinutes?: number[];
  salesStyle: SalesStyle;
  assignmentStrategy: AssignmentStrategy;
  specificWorkosUserId?: string;
};

export const DEFAULT_PREFERRED_TIME = '10:00 AM';

export const DEFAULT_SERVICE_FORM: ServiceForm = {
  name: '',
  description: '',
  isActive: true,
  durationMinutes: 30,
  bufferMinutes: 0,
  timeZone: '',
  fields: DEFAULT_SERVICE_FIELDS.map((field) => ({ ...field })),
  preferredTimeEnabled: false,
  preferredTimes: [DEFAULT_PREFERRED_TIME],
  salesStyle: 'neutral',
  assignmentStrategy: 'balanced',
  specificWorkosUserId: '',
};

function normalizePreferredTimeMinutes(value?: number[] | number) {
  if (value === undefined) return [];
  if (Array.isArray(value)) return value;
  return [value];
}

export function formatPreferredTimesLabel(minutes?: number[]) {
  if (!minutes || minutes.length === 0) return null;
  return minutes.map((value) => minutesToCalendarTimeLabel(value)).join(', ');
}

export function preferredTimesToMinutes(times: string[]) {
  const seen = new Set<number>();
  const result: number[] = [];
  for (const time of times) {
    const minutes = calendarTimeLabelToMinutes(time);
    if (minutes === null || seen.has(minutes)) continue;
    seen.add(minutes);
    result.push(minutes);
  }
  return result;
}

function storedFieldToForm(field: ServiceRow['fields'][number]): ServiceFieldForm {
  return {
    key: field.key,
    label: field.label,
    type: field.type,
    optionsText: (field.options ?? []).join(', '),
  };
}

export function serviceToForm(service: ServiceRow): ServiceForm {
  const preferredTimeMinutes = normalizePreferredTimeMinutes(service.preferredTimeMinutes);
  return {
    name: service.name,
    description: service.description ?? '',
    isActive: service.isActive,
    durationMinutes: service.durationMinutes,
    bufferMinutes: service.bufferMinutes ?? 0,
    timeZone: service.timeZone ?? '',
    fields:
      service.fields.length > 0
        ? service.fields.map(storedFieldToForm)
        : DEFAULT_SERVICE_FIELDS.map((field) => ({ ...field })),
    preferredTimeEnabled: preferredTimeMinutes.length > 0,
    preferredTimes:
      preferredTimeMinutes.length > 0
        ? preferredTimeMinutes.map((value) => minutesToCalendarTimeLabel(value))
        : [DEFAULT_PREFERRED_TIME],
    salesStyle: service.salesStyle,
    assignmentStrategy: service.assignmentStrategy,
    specificWorkosUserId: service.specificWorkosUserId ?? '',
  };
}

export function buildServiceMutationArgs(form: ServiceForm) {
  const preferredTimeMinutes = form.preferredTimeEnabled
    ? preferredTimesToMinutes(form.preferredTimes)
    : [];

  return {
    name: form.name,
    description: form.description,
    isActive: form.isActive,
    durationMinutes: form.durationMinutes,
    bufferMinutes: form.bufferMinutes,
    timeZone: form.timeZone,
    fields: form.fields.map((field) => ({
      key: field.key,
      label: field.label,
      type: field.type,
      options: field.optionsText
        .split(',')
        .map((option) => option.trim())
        .filter(Boolean),
    })),
    preferredTimeMinutes: preferredTimeMinutes.length > 0 ? preferredTimeMinutes : null,
    salesStyle: form.salesStyle,
    assignmentStrategy: form.assignmentStrategy,
    specificWorkosUserId: form.specificWorkosUserId,
  };
}

export function fieldTypeLabel(type: FieldType) {
  switch (type) {
    case 'text':
      return 'Text';
    case 'number':
      return 'Number';
    case 'select':
      return 'Select';
    case 'boolean':
      return 'Yes / No';
    case 'date':
      return 'Date';
    case 'time':
      return 'Time';
    case 'phone':
      return 'Phone';
  }
}

export function parseFieldOptionsText(optionsText: string) {
  return optionsText
    .split(',')
    .map((option) => option.trim())
    .filter(Boolean);
}

export function fieldTypePreview(
  field: Pick<ServiceFieldForm, 'type' | 'optionsText'> | { type: FieldType; options?: string[] },
) {
  const typeLabel = fieldTypeLabel(field.type);
  if (field.type !== 'select') return typeLabel;

  const options =
    'options' in field && field.options?.length
      ? field.options
      : parseFieldOptionsText('optionsText' in field ? field.optionsText : '');

  return options.length > 0 ? `${typeLabel} (${options.join(', ')})` : typeLabel;
}

export function assignmentLabel(strategy: AssignmentStrategy) {
  switch (strategy) {
    case 'conversation_owner':
      return 'Conversation owner first';
    case 'round_robin':
      return 'Round robin';
    case 'specific_user':
      return 'Specific teammate';
    default:
      return 'Balanced';
  }
}

function normalizeFormForCompare(form: ServiceForm) {
  const trimmedName = form.name.trim();
  return JSON.stringify(
    buildServiceMutationArgs({
      ...form,
      name: trimmedName,
    }),
  );
}

export function serviceFormsEqual(a: ServiceForm, b: ServiceForm) {
  return normalizeFormForCompare(a) === normalizeFormForCompare(b);
}

export function salesStyleLabel(style: SalesStyle) {
  switch (style) {
    case 'proactive':
      return 'Proactive';
    case 'gentle':
      return 'Gentle';
    default:
      return 'Neutral';
  }
}
