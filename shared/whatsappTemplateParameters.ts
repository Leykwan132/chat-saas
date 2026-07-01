export const WHATSAPP_TEMPLATE_PARAMETERS = [
  {
    key: 'customer_name',
    label: 'Customer name',
    description: 'Name saved on the customer or conversation.',
    example: 'Jessica Lee',
  },
  {
    key: 'customer_phone',
    label: 'Customer phone',
    description: 'WhatsApp phone number saved for the customer.',
    example: '+60123456789',
  },
  {
    key: 'booking_date',
    label: 'Booking date',
    description: 'Date of the latest active booked appointment.',
    example: 'July 18 (Saturday)',
  },
  {
    key: 'booking_time',
    label: 'Booking time',
    description: 'Time range of the latest active booked appointment.',
    example: '2:00 PM - 3:00 PM',
  },
  {
    key: 'booking_service',
    label: 'Booking service',
    description: 'Service selected for the latest booking.',
    example: 'Consultation',
  },
  {
    key: 'assigned_team_member',
    label: 'Assigned team member',
    description: 'Team member assigned to the booked appointment.',
    example: 'Alicia Tan',
  },
] as const;

export type WhatsAppTemplateParameterKey =
  (typeof WHATSAPP_TEMPLATE_PARAMETERS)[number]['key'];

export type WhatsAppTemplateParameter = {
  key: WhatsAppTemplateParameterKey;
  label: string;
  description: string;
  example: string;
};

const PARAMETER_BY_KEY = new Map(
  WHATSAPP_TEMPLATE_PARAMETERS.map((parameter) => [parameter.key, parameter]),
);

export function getWhatsAppTemplateParameter(
  key: string,
): WhatsAppTemplateParameter | null {
  return PARAMETER_BY_KEY.get(key as WhatsAppTemplateParameterKey) ?? null;
}

export function isWhatsAppTemplateParameterKey(
  key: string,
): key is WhatsAppTemplateParameterKey {
  return PARAMETER_BY_KEY.has(key as WhatsAppTemplateParameterKey);
}

export function getWhatsAppTemplateParameterExample(key: string) {
  return getWhatsAppTemplateParameter(key)?.example ?? null;
}

function uniqueInOrder(values: string[]) {
  const seen = new Set<string>();
  return values.filter((value) => {
    if (seen.has(value)) return false;
    seen.add(value);
    return true;
  });
}

export function extractAtParameterKeys(text: string) {
  const keys: string[] = [];
  const regex = /(^|[^A-Za-z0-9_])@([a-z][a-z0-9_]*)\b/g;
  for (const match of text.matchAll(regex)) {
    keys.push(match[2]);
  }
  return uniqueInOrder(keys);
}

export function extractNamedPlaceholderKeys(text: string) {
  const keys: string[] = [];
  const regex = /\{\{([a-z][a-z0-9_]*)\}\}/g;
  for (const match of text.matchAll(regex)) {
    keys.push(match[1]);
  }
  return uniqueInOrder(keys);
}

export function extractTemplateParameterKeys(text: string) {
  const keys: string[] = [];
  const regex = /(^|[^A-Za-z0-9_])@([a-z][a-z0-9_]*)\b|\{\{([a-z][a-z0-9_]*)\}\}/g;
  for (const match of text.matchAll(regex)) {
    const key = match[2] ?? match[3];
    if (key) keys.push(key);
  }
  return uniqueInOrder(keys);
}

export function findUnknownTemplateParameters(text: string) {
  return extractTemplateParameterKeys(text).filter(
    (key) => !isWhatsAppTemplateParameterKey(key),
  );
}

export function convertAtParametersToNamedPlaceholders(text: string) {
  return text.replace(
    /(^|[^A-Za-z0-9_])@([a-z][a-z0-9_]*)\b/g,
    (match, prefix: string, key: string) => {
      if (!isWhatsAppTemplateParameterKey(key)) return match;
      return `${prefix}{{${key}}}`;
    },
  );
}

export function bodyTextNamedParamsForKeys(keys: string[]) {
  return keys.map((key) => {
    const parameter = getWhatsAppTemplateParameter(key);
    if (parameter === null) {
      throw new Error(`Unknown WhatsApp template parameter: ${key}`);
    }
    return {
      param_name: parameter.key,
      example: parameter.example,
    };
  });
}

export function findActiveAtTrigger(text: string, cursor: number) {
  const beforeCursor = text.slice(0, cursor);
  const match = beforeCursor.match(/(^|[\s([{])@([a-z0-9_]*)$/i);
  if (!match) return null;
  const prefixLength = match[1].length;
  const query = match[2].toLowerCase();
  return {
    start: beforeCursor.length - query.length - 1,
    end: cursor,
    query,
    prefixLength,
  };
}
