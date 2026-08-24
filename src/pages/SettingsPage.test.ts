import { readFileSync } from "node:fs";
import { expect, test } from "vitest";

const settingsSource = readFileSync(
  new URL("./SettingsPage.tsx", import.meta.url),
  "utf8",
);

test("only exposes password reset to active password accounts", () => {
  expect(settingsSource).toContain("hasCurrentPasswordAccount");
  expect(settingsSource).toContain("startCurrentUserPasswordReset");
  expect(settingsSource).toContain("Reset password");
  expect(settingsSource).toContain("window.location.assign");
  expect(settingsSource).toContain("passwordResetUrl");
});
