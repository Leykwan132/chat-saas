import { readFileSync } from "node:fs";
import { expect, test } from "vitest";

const pageSource = readFileSync(
  new URL("./ResetPasswordPage.tsx", import.meta.url),
  "utf8",
);
const actionsSource = readFileSync(
  new URL("../../convex/whiteLabel/customerPasswordResetActions.ts", import.meta.url),
  "utf8",
);
const settingsSource = readFileSync(
  new URL("./SettingsPage.tsx", import.meta.url),
  "utf8",
);

const mainSource = readFileSync(
  new URL("../main.tsx", import.meta.url),
  "utf8",
);

test("completes password reset on the current host and returns to sign-in", () => {
  expect(settingsSource).toContain("window.location.origin");
  expect(settingsSource).toContain("returnPath: '/sign-in'");
  expect(settingsSource).toContain(
    "customerPasswordResetActions.startCurrentUserPasswordReset",
  );
  expect(pageSource).toContain("confirmPasswordReset");
  expect(pageSource).toContain("sanitizePasswordResetReturnPath");
  expect(pageSource).toContain("signOut({ navigate: false })");
  expect(pageSource).toContain("navigate(returnTo, { replace: true })");
  expect(mainSource).toContain('path="/reset-password"');
  expect(actionsSource).toContain("workos.userManagement.createPasswordReset");
  expect(actionsSource).toContain("passwordResetToken");
  expect(actionsSource).toContain("buildSameOriginPasswordResetUrl");
  expect(actionsSource).toContain("workos.userManagement.resetPassword");
});
