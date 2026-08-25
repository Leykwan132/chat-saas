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

test("groups each dialog close action beside its primary action", () => {
  expect(source).toContain('className="justify-end gap-2"');
  expect(source.match(/variant="ghost"/g)).toHaveLength(3);
  expect(source.match(/>\n              Close\n            <\/Button>/g)).toHaveLength(3);
  expect(source).toContain("setIsOrganizationDialogOpen(false)");
  expect(source).toContain("setIsCustomerDialogOpen(false)");
  expect(source).toContain("setIsCreditDialogOpen(false)");
});
