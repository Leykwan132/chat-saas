import { expect, test } from "vitest";
import { hideSystemErrorText, SYSTEM_REPORTED_ERROR } from "./systemErrorText";

test("replaces a validator failure with a brief system message", () => {
  const text = [
    "Customer wants to book a batch of 5 appointments.",
    'ArgumentValidationError: Object contains extra field `kind` that is not in the validator.',
  ].join(" ");
  expect(hideSystemErrorText(text)).toBe(SYSTEM_REPORTED_ERROR);
});

test("leaves an ordinary booking reply unchanged", () => {
  const text = "All five appointments are booked.";
  expect(hideSystemErrorText(text)).toBe(text);
});
