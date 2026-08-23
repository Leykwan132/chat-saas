import { expect, test } from "vitest";
import {
  DEFAULT_WEB_WIDGET_HOME,
  DEFAULT_WEB_WIDGET_LEAD_FORM,
  DEFAULT_WEB_WIDGET_PROMPT_PLACEHOLDER,
  isWebWidgetLeadFormValid,
  normalizeWebWidgetExperience,
} from "./webWidgetExperience";

test("uses one fixed prompt placeholder for AI widgets", () => {
  expect(DEFAULT_WEB_WIDGET_PROMPT_PLACEHOLDER).toBe("Ask a question…");
});

test("normalizes an unconfigured widget to the direct chat experience", () => {
  expect(normalizeWebWidgetExperience({})).toEqual({
    home: {
      greeting: "Hello there.",
      introduction: "How can we help?",
      availabilityText: "We are online",
      replyTimeText: "Typically replies in a day",
    },
    leadForm: {
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
    },
  });
});

test("preserves valid custom text and dropdown fields", () => {
  expect(
    normalizeWebWidgetExperience({
      leadForm: {
        enabled: true,
        customFields: [
          {
            id: "company_size",
            label: " Company size ",
            type: "select",
            options: ["1–10", "11–50"],
            required: false,
          },
          {
            id: "website",
            label: "Website",
            type: "text",
            options: ["Ignored"],
          },
        ],
      },
    }),
  ).toMatchObject({
    leadForm: {
      customFields: [
        {
          id: "company_size",
          label: "Company size",
          type: "select",
          options: ["1–10", "11–50"],
          required: false,
        },
        {
          id: "website",
          label: "Website",
          type: "text",
          options: [],
          required: true,
        },
      ],
    },
  });
});

test("preserves custom contact, numeric, and website field types", () => {
  expect(
    normalizeWebWidgetExperience({
      leadForm: {
        customFields: [
          { id: "work_email", label: "Work email", type: "email" as never, options: [] },
          { id: "mobile", label: "Mobile", type: "phone" as never, options: [] },
          { id: "seats", label: "Seats", type: "number" as never, options: [] },
          { id: "website", label: "Website", type: "url" as never, options: [] },
        ],
      },
    }),
  ).toMatchObject({
    leadForm: {
      customFields: [
        { id: "work_email", type: "email" },
        { id: "mobile", type: "phone" },
        { id: "seats", type: "number" },
        { id: "website", type: "url" },
      ],
    },
  });
});

test("does not expose the retired initial assistant message", () => {
  const experience = normalizeWebWidgetExperience({
    home: {
      initialMessage: "Welcome back",
    } as never,
  });

  expect(experience.home).not.toHaveProperty("initialMessage");
});

test("preserves whether visible standard fields are optional or required", () => {
  expect(
    normalizeWebWidgetExperience({
      home: { greeting: " Welcome " },
      leadForm: {
        enabled: true,
        fields: {
          name: { visible: false, required: true },
          email: { visible: false, required: false },
          phone: { visible: true, required: false },
        },
      },
    }),
  ).toEqual({
    home: { ...DEFAULT_WEB_WIDGET_HOME, greeting: "Welcome" },
    leadForm: {
      ...DEFAULT_WEB_WIDGET_LEAD_FORM,
      enabled: true,
      fields: {
        name: { visible: false, required: false },
        email: { visible: false, required: false },
        phone: { visible: true, required: false },
      },
    },
  });
});

test("uses standard visitor-form copy instead of saved custom copy", () => {
  expect(
    normalizeWebWidgetExperience({
      leadForm: {
        enabled: true,
        heading: "Tell us about yourself",
        description: "We will use this to follow up.",
        submitLabel: "Start chat",
        fields: {
          name: { visible: true, required: false },
        },
      },
    }),
  ).toMatchObject({
    leadForm: {
      enabled: true,
      heading: "Before we begin",
      description: "Share your details so we can better help you.",
      submitLabel: "Continue",
      fields: {
        name: { visible: true, required: false },
      },
    },
  });
});

test("allows a visitor form that collects visible optional fields", () => {
  expect(
    isWebWidgetLeadFormValid({
      ...DEFAULT_WEB_WIDGET_LEAD_FORM,
      enabled: true,
      fields: {
        name: { visible: true, required: false },
        email: { visible: false, required: false },
        phone: { visible: false, required: false },
      },
    }),
  ).toBe(true);
});
