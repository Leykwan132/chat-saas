import { expect, test } from "vitest";
import { resolveMessageWaitSeconds } from "./messageWaitTime";

test("system-managed message grouping defaults to five seconds", () => {
  expect(resolveMessageWaitSeconds(undefined)).toBe(5);
});

test.each([-1, 61, 1.5, NaN, Infinity])(
  "invalid internal wait values fail explicitly: %s",
  (value) => {
    expect(() => resolveMessageWaitSeconds(value)).toThrow(
      "whole number of seconds",
    );
  },
);
