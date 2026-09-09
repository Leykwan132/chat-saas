import { ConvexError } from "convex/values";
import { expect, test } from "vitest";
import { isAccountUnavailableError } from "./accountUnavailable";

test("recognizes the structured unavailable-account auth error", () => {
  expect(
    isAccountUnavailableError(
      new ConvexError({ code: "ACCOUNT_UNAVAILABLE" }),
    ),
  ).toBe(true);
});

test("does not treat unrelated errors as unavailable accounts", () => {
  expect(isAccountUnavailableError(new Error("Account unavailable"))).toBe(false);
});
