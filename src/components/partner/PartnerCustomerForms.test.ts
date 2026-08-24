import { readFileSync } from "node:fs";
import { expect, test } from "vitest";

const source = readFileSync(
  new URL("./PartnerCustomerForms.tsx", import.meta.url),
  "utf8",
);

test("shows one-time customer credentials after creation", () => {
  expect(source).toContain("PartnerCustomerCredentialsDialog");
  expect(source).toContain("CustomerCredentials");
  expect(source).toContain("setCustomerCredentials");
});
