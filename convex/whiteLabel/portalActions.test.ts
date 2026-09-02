import { readFile } from "node:fs/promises";
import { expect, test } from "vitest";

test("keeps the Node portal module action-only", async () => {
  const source = await readFile(new URL("./portalActions.ts", import.meta.url), "utf8");
  expect(source).not.toContain("internalQuery");
  expect(source).not.toContain("internalMutation");
  expect(source).toContain("portalAuthorization.assertPartnerOwner");
  expect(source).toContain("portalAuthorization.getInvitableOrganization");
  expect(source).toContain("email: auth.email");
  expect(source).not.toContain("auth.identity.email");
});
