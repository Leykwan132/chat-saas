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

export type WebWidgetLeadForm = {
  enabled: boolean;
  heading: string;
  description: string;
  submitLabel: string;
  fields: Record<"name" | "email" | "phone", WebWidgetLeadField>;
};

export const DEFAULT_WEB_WIDGET_HOME: WebWidgetHome = {
  greeting: "Hi there! 👋",
  introduction: "We make it simple to connect with us. Feel free to ask us anything or share your feedback.",
  availabilityText: "We are online",
  replyTimeText: "Typically replies in a day",
};

export const DEFAULT_WEB_WIDGET_LEAD_FORM: WebWidgetLeadForm = {
  enabled: false,
  heading: "Before we begin",
  description: "Share your details so we can better help you.",
  submitLabel: "Continue",
  fields: {
    name: { visible: true, required: true },
    email: { visible: true, required: true },
    phone: { visible: false, required: false },
  },
};

type WebWidgetExperienceInput = {
  home?: Partial<WebWidgetHome>;
  leadForm?: Partial<Omit<WebWidgetLeadForm, "fields">> & {
    fields?: Partial<WebWidgetLeadForm["fields"]>;
  };
};

function normalizedText(value: string | undefined, defaultValue: string) {
  return value === undefined ? defaultValue : value.trim();
}

function normalizeField(
  field: Partial<WebWidgetLeadField> | undefined,
  defaultField: WebWidgetLeadField,
) {
  const required = field?.required ?? defaultField.required;
  return {
    visible: required || (field?.visible ?? defaultField.visible),
    required,
  };
}

export function normalizeWebWidgetExperience(input: WebWidgetExperienceInput) {
  const leadForm = input.leadForm;
  return {
    home: {
      greeting: normalizedText(input.home?.greeting, DEFAULT_WEB_WIDGET_HOME.greeting),
      introduction: normalizedText(input.home?.introduction, DEFAULT_WEB_WIDGET_HOME.introduction),
      availabilityText: normalizedText(input.home?.availabilityText, DEFAULT_WEB_WIDGET_HOME.availabilityText),
      replyTimeText: normalizedText(input.home?.replyTimeText, DEFAULT_WEB_WIDGET_HOME.replyTimeText),
    },
    leadForm: {
      enabled: leadForm?.enabled ?? DEFAULT_WEB_WIDGET_LEAD_FORM.enabled,
      heading: normalizedText(leadForm?.heading, DEFAULT_WEB_WIDGET_LEAD_FORM.heading),
      description: normalizedText(leadForm?.description, DEFAULT_WEB_WIDGET_LEAD_FORM.description),
      submitLabel: normalizedText(leadForm?.submitLabel, DEFAULT_WEB_WIDGET_LEAD_FORM.submitLabel),
      fields: {
        name: normalizeField(leadForm?.fields?.name, DEFAULT_WEB_WIDGET_LEAD_FORM.fields.name),
        email: normalizeField(leadForm?.fields?.email, DEFAULT_WEB_WIDGET_LEAD_FORM.fields.email),
        phone: normalizeField(leadForm?.fields?.phone, DEFAULT_WEB_WIDGET_LEAD_FORM.fields.phone),
      },
    },
  };
}
