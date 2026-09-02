import { expect, test } from "vitest";
import { completePartnerCustomerRemoval } from "./partnerCustomerRemoval";

test("treats a fulfilled null customer removal as complete", async () => {
  await expect(
    completePartnerCustomerRemoval(async () => null),
  ).resolves.toBe(true);
});

test("preserves a customer removal failure", async () => {
  await expect(
    completePartnerCustomerRemoval(async () => {
      throw new Error("Removal failed");
    }),
  ).rejects.toThrow("Removal failed");
});
