export type WebWidgetHome = {
  greeting: string;
  introduction: string;
  availabilityText: string;
  replyTimeText: string;
};

export type WebWidgetLeadField = {
  visible: boolean;
  required: boolean;
};

export const WEB_WIDGET_CUSTOM_LEAD_FIELD_TYPES = [
  "text",
  "email",
  "phone",
  "number",
  "url",
  "select",
] as const;

export type WebWidgetCustomLeadFieldType =
  (typeof WEB_WIDGET_CUSTOM_LEAD_FIELD_TYPES)[number];

export type WebWidgetCustomLeadField = {
  id: string;
  label: string;
  type: WebWidgetCustomLeadFieldType;
  options: string[];
  required: boolean;
};

const customLeadFieldInputTypes: Record<
  Exclude<WebWidgetCustomLeadFieldType, "select">,
  string
> = {
  text: "text",
  email: "email",
  phone: "tel",
  number: "number",
  url: "url",
};

export function getWebWidgetCustomLeadFieldInputType(
  type: Exclude<WebWidgetCustomLeadFieldType, "select">,
) {
  return customLeadFieldInputTypes[type];
}

export type WebWidgetCustomLeadFieldInput = Omit<
  WebWidgetCustomLeadField,
  "required"
> & {
  required?: boolean;
};

export type WebWidgetLeadForm = {
  enabled: boolean;
  heading: string;
  description: string;
  submitLabel: string;
  fields: Record<"name" | "email" | "phone", WebWidgetLeadField>;
  customFields: WebWidgetCustomLeadField[];
};

export const DEFAULT_WEB_WIDGET_HOME: WebWidgetHome = {
  greeting: "Hello there.",
  introduction: "How can we help?",
  availabilityText: "We are online",
  replyTimeText: "Typically replies in a day",
};

export const DEFAULT_WEB_WIDGET_PROMPT_PLACEHOLDER = "Ask a question…";

export const DEFAULT_WEB_WIDGET_LEAD_FORM: WebWidgetLeadForm = {
  enabled: false,
  heading: "Before we begin",
  description: "Share your details so we can better help you.",
  submitLabel: "Continue",
  fields: {
    name: { visible: true, required: true },
    email: { visible: true, required: true },
    phone: { visible: true, required: false },
  },
  customFields: [],
};

export type WebWidgetLeadFormInput = Partial<
  Omit<WebWidgetLeadForm, "fields" | "customFields">
> & {
  fields?: Partial<WebWidgetLeadForm["fields"]>;
  customFields?: WebWidgetCustomLeadFieldInput[];
};

type WebWidgetExperienceInput = {
  home?: Partial<WebWidgetHome>;
  leadForm?: WebWidgetLeadFormInput;
};

const customFieldIdPattern = /^[a-z][a-z0-9_]{0,63}$/;

function normalizeCustomField(field: WebWidgetCustomLeadFieldInput) {
  const id = field.id.trim();
  const label = field.label.trim();
  const type = field.type;
  const options = type === "select"
    ? [...new Set(field.options.map((option) => option.trim()).filter(Boolean))]
    : [];
  if (
    !customFieldIdPattern.test(id) ||
    !label ||
    !WEB_WIDGET_CUSTOM_LEAD_FIELD_TYPES.includes(type) ||
    (type === "select" && options.length < 2)
  ) {
    return null;
  }
  return { id, label, type, options, required: field.required ?? true };
}

function normalizeCustomFields(fields: WebWidgetCustomLeadFieldInput[] | undefined) {
  const usedIds = new Set<string>();
  return (fields ?? []).flatMap((field) => {
    const normalized = normalizeCustomField(field);
    if (normalized === null || usedIds.has(normalized.id)) return [];
    usedIds.add(normalized.id);
    return [normalized];
  });
}

function normalizedText(value: string | undefined, defaultValue: string) {
  return value === undefined ? defaultValue : value.trim();
}

function normalizeField(
  field: Partial<WebWidgetLeadField> | undefined,
  defaultField: WebWidgetLeadField,
) {
  const visible = field?.visible ?? defaultField.visible;
  return {
    visible,
    required: visible && (field?.required ?? defaultField.required),
  };
}

export function normalizeWebWidgetExperience(input: WebWidgetExperienceInput) {
  const leadForm = input.leadForm;
  return {
    home: {
      greeting: normalizedText(
        input.home?.greeting,
        DEFAULT_WEB_WIDGET_HOME.greeting,
      ),
      introduction: normalizedText(
        input.home?.introduction,
        DEFAULT_WEB_WIDGET_HOME.introduction,
      ),
      availabilityText: normalizedText(
        input.home?.availabilityText,
        DEFAULT_WEB_WIDGET_HOME.availabilityText,
      ),
      replyTimeText: normalizedText(
        input.home?.replyTimeText,
        DEFAULT_WEB_WIDGET_HOME.replyTimeText,
      ),
    },
    leadForm: {
      enabled: leadForm?.enabled ?? DEFAULT_WEB_WIDGET_LEAD_FORM.enabled,
      heading: DEFAULT_WEB_WIDGET_LEAD_FORM.heading,
      description: DEFAULT_WEB_WIDGET_LEAD_FORM.description,
      submitLabel: DEFAULT_WEB_WIDGET_LEAD_FORM.submitLabel,
      fields: {
        name: normalizeField(
          leadForm?.fields?.name,
          DEFAULT_WEB_WIDGET_LEAD_FORM.fields.name,
        ),
        email: normalizeField(
          leadForm?.fields?.email,
          DEFAULT_WEB_WIDGET_LEAD_FORM.fields.email,
        ),
        phone: normalizeField(
          leadForm?.fields?.phone,
          DEFAULT_WEB_WIDGET_LEAD_FORM.fields.phone,
        ),
      },
      customFields: normalizeCustomFields(leadForm?.customFields),
    },
  };
}

export function isWebWidgetLeadFormValid(leadForm: WebWidgetLeadForm) {
  const hasStandardField = Object.values(leadForm.fields).some(
    (field) => field.visible,
  );
  const normalizedCustomFields = normalizeCustomFields(leadForm.customFields);
  return (
    (hasStandardField || normalizedCustomFields.length > 0) &&
    normalizedCustomFields.length === leadForm.customFields.length
  );
}
