import { expect, test } from "vitest";
import { normalizeTelegramPhone } from "./phone";

test.each([
  ["60129499394", "60129499394"],
  ["+60 12-949 9394", "60129499394"],
  ["0060129499394", "60129499394"],
])("normalizes %s", (input, expected) => {
  expect(normalizeTelegramPhone(input)).toBe(expected);
});

test.each(["0129499394", "1234567", "+", "0060abc"])(
  "rejects non-international input %s",
  (input) => {
    expect(() => normalizeTelegramPhone(input)).toThrow("international phone number");
  },
);
