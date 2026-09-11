import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { expect, test } from "vitest";
import { ResetPasswordPreparingState } from "./ResetPasswordDialog";

const dialogSource = readFileSync(
  new URL("./ResetPasswordDialog.tsx", import.meta.url),
  "utf8",
);

test("shows preparing session while the reset is loading", () => {
  const markup = renderToStaticMarkup(<ResetPasswordPreparingState />);
  expect(markup).toContain("Preparing session");
  expect(markup).toContain('role="status"');
});

test("opens from settings and confirms with the in-app token", () => {
  expect(dialogSource).toContain("startCurrentUserPasswordReset");
  expect(dialogSource).toContain("confirmPasswordReset");
  expect(dialogSource).toContain("passwordResetToken");
  expect(dialogSource).toContain("window.location.origin");
  expect(dialogSource).toContain("signOut({ navigate: false })");
  expect(dialogSource).toContain("navigate('/sign-in', { replace: true })");
  expect(dialogSource).not.toContain("window.location.assign");
  expect(dialogSource).not.toContain("passwordResetUrl");
});
