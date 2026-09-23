import { readFileSync } from "node:fs";
import { expect, test } from "vitest";

const source = readFileSync(new URL("./CustomerDetailPage.tsx", import.meta.url), "utf8");

test("loads tag suggestions from the workspace tag catalog", () => {
  expect(source).toContain("api.customerTags.listForCurrentOrg");
  expect(source).not.toContain("api.customers.listForCurrentOrg");
});
