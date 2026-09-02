import { readFileSync } from "node:fs";
import { expect, test } from "vitest";

const source = readFileSync(
  new URL("./customerAccountActions.ts", import.meta.url),
  "utf8",
);

test("returns one-time initial credentials after direct WorkOS provisioning", () => {
  expect(source).toContain("workos.userManagement.createUser");
  expect(source).toContain("emailVerified: true");
  expect(source).toContain(
    "workos.userManagement.createOrganizationMembership",
  );
  expect(source).toContain("workos.userManagement.createPasswordReset");
  expect(source).toContain(
    "internal.whiteLabel.customerAccounts.persistActiveAccount",
  );
  expect(source).toContain("initialPassword: v.string()");
  expect(source).toContain("email: v.string()");
  expect(source).toContain("initialPassword,");
  expect(source).not.toContain("passwordResetToken");
  expect(source).not.toContain("console.log");
});
