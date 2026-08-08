import { expect, test } from "vitest";
import { aiReplyOutputSchema } from "./aiReplyOutput";

test("validates two to four ordered AI reply messages", () => {
  const output = aiReplyOutputSchema.parse({
    messages: [
      "Thanks for reaching out!",
      "Which service can I help you with?",
    ],
  });

  expect(output.messages).toEqual([
    "Thanks for reaching out!",
    "Which service can I help you with?",
  ]);
  expect(() =>
    aiReplyOutputSchema.parse({
      messages: ["Only one message."],
    }),
  ).toThrow();
  expect(() =>
    aiReplyOutputSchema.parse({
      messages: ["One", "Two", "Three", "Four", "Five"],
    }),
  ).toThrow();
  expect(() =>
    aiReplyOutputSchema.parse({
      messages: ["Valid", "   "],
    }),
  ).toThrow();
});
