import { expect, test } from "vitest";
import {
  assertMessengerConnectAllowed,
  isMessengerUserAllowed,
} from "./messengerAccess";

test.each([
  ["leykwan132@gmail.com", true],
  ["LEYKWAN132@GMAIL.COM", true],
  ["other@example.com", false],
  [undefined, false],
] as const)("allows Messenger only for %s", (email, expected) => {
  expect(isMessengerUserAllowed(email)).toBe(expected);
});

test("rejects Messenger connect attempts outside the allowlist", () => {
  expect(() => assertMessengerConnectAllowed("other@example.com")).toThrow(
    "Messenger is not available for this account.",
  );
  expect(() => assertMessengerConnectAllowed("leykwan132@gmail.com")).not.toThrow();
});
