import { describe, expect, test } from "vitest";
import {
  deductPartnerOrganizationCredits,
  resolvePartnerOrganizationPlan,
} from "./partnerCreditModel";

describe("partner organization credit model", () => {
  test("keeps the current monthly allowance until the next cycle", () => {
    expect(
      resolvePartnerOrganizationPlan({
        currentPlanKey: "starter",
        pendingPlanKey: "growth",
        periodEnd: 2_000,
        now: 1_999,
      }),
    ).toBe("starter");

    expect(
      resolvePartnerOrganizationPlan({
        currentPlanKey: "starter",
        pendingPlanKey: "growth",
        periodEnd: 2_000,
        now: 2_000,
      }),
    ).toBe("growth");
  });

  test("deducts a workspace monthly allowance before its manual grants", () => {
    expect(
      deductPartnerOrganizationCredits({
        monthlyRemaining: 120,
        manualGrantRemaining: 50,
        credits: 150,
      }),
    ).toEqual({ monthlyCredits: 120, manualGrantCredits: 30 });
  });
});
