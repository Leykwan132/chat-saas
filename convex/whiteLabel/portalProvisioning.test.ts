/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { internal } from "../_generated/api";
import schema from "../schema";
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
      maxAgents: 3,
      monthlyCredits: 12345,
      modelId: "deepseek/deepseek-v4-flash",
    },
  );

  const { balance, plan } = await t.run(async (ctx) => ({
    balance: await getPartnerCreditBalance(ctx, created.partnerOrganizationId),
    plan: await ctx.db
      .query("whiteLabelPartnerOrganizationPlans")
      .withIndex("by_partnerOrganizationId", (q) =>
        q.eq("partnerOrganizationId", created.partnerOrganizationId),
      )
      .unique(),
  }));
  expect(balance.period).not.toBeNull();
  expect(balance.period?.grantedCredits).toBe(12345);
  expect(balance.remainingCredits).toBe(12345);
  expect(plan?.maxAgents).toBe(3);
  expect(plan?.monthlyCredits).toBe(12345);
  expect(plan?.modelId).toBe("deepseek/deepseek-v4-flash");
});
