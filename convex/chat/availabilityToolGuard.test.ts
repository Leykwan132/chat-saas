import { expect, test } from "vitest";
import { availabilityToolCallRequirement } from "./availabilityToolGuard";

test("requires the live availability tool for availability questions", () => {
  expect(availabilityToolCallRequirement({
    question: "What slots do you have available tomorrow?",
    hasAvailabilityTool: true,
  })).toEqual({
    activeTools: ["checkAvailability"],
    toolChoice: { type: "tool", toolName: "checkAvailability" },
  });
});

test.each([
  "Are you free tomorrow?",
  "Do you have anything on Tuesday?",
  "Is 3pm okay?",
  "Tuesday at 3 works for me.",
])("requires the live availability tool for '%s'", (question) => {
  expect(availabilityToolCallRequirement({ question, hasAvailabilityTool: true })).toEqual({
    activeTools: ["checkAvailability"],
    toolChoice: { type: "tool", toolName: "checkAvailability" },
  });
});

test("leaves ordinary questions and agents without booking services unconstrained", () => {
  expect(availabilityToolCallRequirement({
    question: "What is included in the consultation?",
    hasAvailabilityTool: true,
  })).toBeUndefined();
  expect(availabilityToolCallRequirement({
    question: "What slots do you have available tomorrow?",
    hasAvailabilityTool: false,
  })).toBeUndefined();
});
