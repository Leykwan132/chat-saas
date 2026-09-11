import { readFileSync } from "node:fs";
import { expect, test } from "vitest";

const source = readFileSync(
  new URL("./AccountUnavailableBoundary.tsx", import.meta.url),
  "utf8",
);

test("replaces the active route with home after an unavailable-account error", () => {
  expect(source).toContain("isAccountUnavailableError(error)");
  expect(source).toContain("<Dialog open>");
  expect(source).toContain("Back to home");
  expect(source).toContain("Preparing session");
});

test("clears the saved partner session before returning home", () => {
  expect(source).toContain("clearPartnerSession()");
  expect(source).toContain("signOut({ navigate: false })");
  expect(source).toContain('window.location.replace("/")');
  expect(source).not.toContain("navigate('/', { replace: true })");
  expect(source).not.toContain("resetErrorBoundary");
});
