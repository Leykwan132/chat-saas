import { expect, test } from "vitest";
import {
  DEFAULT_WEB_WIDGET_HOME,
  DEFAULT_WEB_WIDGET_LEAD_FORM,
  normalizeWebWidgetExperience,
} from "./webWidgetExperience";

test("normalizes an unconfigured widget to the dark right-side home experience", () => {
  expect(normalizeWebWidgetExperience({})).toEqual({
    home: {
      greeting: "Hi there! 👋",
      introduction: "We make it simple to connect with us. Feel free to ask us anything or share your feedback.",
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
        phone: { visible: false, required: false },
      },
    },
  });
});

test("makes required fields visible when normalizing a saved form", () => {
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
        name: { visible: true, required: true },
        email: { visible: false, required: false },
        phone: { visible: true, required: false },
      },
    },
  });
});
