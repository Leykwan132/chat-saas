import { readFileSync } from "node:fs";
import { expect, test } from "vitest";

const source = readFileSync(
  new URL("./AccountUnavailableBoundary.tsx", import.meta.url),
  "utf8",
);

test("replaces the active route with home after an unavailable-account error", () => {
  expect(source).toContain("isAccountUnavailableError(error)");
  expect(source).toContain("navigate('/', { replace: true })");
  expect(source).toContain("<Dialog open>");
  expect(source).toContain("Back to home");
});
