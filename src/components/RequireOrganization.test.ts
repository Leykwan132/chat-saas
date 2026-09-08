import { readFileSync } from "node:fs";
import { expect, test } from "vitest";

const requireOrganizationSource = readFileSync(
  new URL("./RequireOrganization.tsx", import.meta.url),
  "utf8",
);
const onboardingSource = readFileSync(
  new URL("./OnboardingFlow.tsx", import.meta.url),
  "utf8",
);
const ensureWorkspaceSource = readFileSync(
  new URL("./onboarding/useEnsureNativePersonalWorkspace.ts", import.meta.url),
  "utf8",
);

test("provisions a native personal workspace for partner-created users", () => {
  expect(requireOrganizationSource).toContain("needsPersonalWorkspace");
  expect(requireOrganizationSource).toContain("ensureCurrentUser");
  expect(onboardingSource).toContain("needsPersonalWorkspace");
  expect(onboardingSource).toContain("useEnsureNativePersonalWorkspace");
  expect(ensureWorkspaceSource).toContain("ensureCurrentUser");
});
