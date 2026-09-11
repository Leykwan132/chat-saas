import { readFileSync } from "node:fs";
import { expect, test } from "vitest";

const source = readFileSync(
  new URL("./PartnerCustomerForms.tsx", import.meta.url),
  "utf8",
);
const createOrganizationSource = readFileSync(
  new URL("./PartnerCreateOrganizationDialog.tsx", import.meta.url),
  "utf8",
);

test("shows one-time customer credentials after creation", () => {
  expect(source).toContain("PartnerCustomerCredentialsDialog");
  expect(source).toContain("CustomerCredentials");
  expect(source).toContain("setCustomerCredentials");
});

test("groups each dialog close action beside its primary action", () => {
  const combined = source + createOrganizationSource;
  expect(combined).toContain('className="justify-end gap-2"');
  expect(combined.match(/variant="ghost"/g)).toHaveLength(3);
  expect(combined.match(/>\s*Close\s*<\/Button>/g)).toHaveLength(3);
  expect(createOrganizationSource).toContain("setOpen(false)");
  expect(source).toContain("setIsCustomerDialogOpen(false)");
  expect(source).toContain("setIsCreditDialogOpen(false)");
});
