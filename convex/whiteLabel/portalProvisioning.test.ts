/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { internal } from "../_generated/api";
import schema from "../schema";
import { PLAN_CATALOG } from "../planCatalog";
import { getPartnerCreditBalance } from "./creditLedger";

const modules = import.meta.glob("/convex/**/*.ts");

test("a created organization has its first credit period in the same transaction", async () => {
  const t = convexTest(schema, modules);
  const { partnerId } = await t.run(async (ctx) => {
    const now = Date.now();
    await ctx.db.insert("users", {
      workosUserId: "user_partner_owner",
      email: "owner@partner.test",
      createdAt: now,
      updatedAt: now,
    });
    const partnerId = await ctx.db.insert("whiteLabelPartners", {
      name: "Acme",
      status: "active",
      createdAt: now,
      updatedAt: now,
    });
    return { partnerId };
  });

  const created = await t.mutation(
    internal.whiteLabel.portalProvisioning.persistCreatedOrganization,
    {
      partnerId,
      workosUserId: "user_partner_owner",
      workosOrgId: "org_new",
      name: "New Customer",
      planKey: "growth",
    },
  );

  const balance = await t.run((ctx) =>
    getPartnerCreditBalance(ctx, created.partnerOrganizationId),
  );
  expect(balance.period).not.toBeNull();
  expect(balance.period?.grantedCredits).toBe(PLAN_CATALOG.growth.monthlyCredits);
  expect(balance.remainingCredits).toBe(PLAN_CATALOG.growth.monthlyCredits);
});
