import { expect, test } from "vitest";
import {
  assertInstagramConnectAllowed,
  isInstagramUserAllowed,
} from "./instagramAccess";

test.each([
  ["leykwan132@gmail.com", true],
  ["LEYKWAN132@GMAIL.COM", true],
  ["other@example.com", false],
  [undefined, false],
] as const)("allows Instagram only for %s", (email, expected) => {
  expect(isInstagramUserAllowed(email)).toBe(expected);
});

test("rejects Instagram connect attempts outside the allowlist", () => {
  expect(() => assertInstagramConnectAllowed("other@example.com")).toThrow(
    "Instagram is not available for this account.",
  );
  expect(() => assertInstagramConnectAllowed("leykwan132@gmail.com")).not.toThrow();
});
