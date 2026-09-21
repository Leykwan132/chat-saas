import { expect, test } from "vitest";
import { buildBusinessCreditPeriodRepairPatch } from "./creditPeriodRepairMigration";

test("rebuilds a Business period from its recorded usage", () => {
  expect(buildBusinessCreditPeriodRepairPatch([21, 0.5, 1, 1])).toEqual({
    grantedCredits: 20_000,
    usedCredits: 23.5,
    planKey: "business",
  });
});
