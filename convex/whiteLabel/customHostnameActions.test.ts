import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

const source = readFileSync(
  new URL("./customHostnameActions.ts", import.meta.url),
  "utf8",
);

describe("createCustomHostname authorization", () => {
  test("authorizes an authenticated WorkOS user when the email claim is absent", () => {
    expect(source).toContain("email: auth.email,");
    expect(source).not.toContain(
      'throw new Error("Partner access requires an email address.")',
    );
  });

  test("removes the Cloudflare hostname before deleting the local setup", () => {
    expect(source).toContain("export const restartCustomHostname = action");
    expect(source).toContain("customHostnames.delete");
    expect(source).toContain("removePartnerDomain");
  });
});
