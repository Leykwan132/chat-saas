/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import schema from "../schema";
import { PLAN_CATALOG } from "../planCatalog";
import { getPartnerCreditBalance } from "./creditLedger";
import { applyPartnerOrganizationEntitlements } from "./entitlementChange";

const modules = import.meta.glob("/convex/**/*.ts");
const DAY = 24 * 60 * 60 * 1000;

test("partner entitlement overrides rewrite agents and the current monthly grant", async () => {
  const t = convexTest(schema, modules);
  const seeded = await t.run(async (ctx) => {
    const now = Date.now();
    const userId = await ctx.db.insert("users", {
      workosUserId: "user_owner",
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
    const teamId = await ctx.db.insert("teams", {
      type: "organizational",
      name: "Customer",
      ownerId: userId,
      workosOrgId: "org_customer",
      createdAt: now,
      updatedAt: now,
    });
    const partnerOrganizationId = await ctx.db.insert(
      "whiteLabelPartnerOrganizations",
      {
        partnerId,
        teamId,
        status: "active",
        createdByUserId: userId,
        createdAt: now,
        updatedAt: now,
      },
    );
    await ctx.db.insert("whiteLabelPartnerOrganizationPlans", {
      partnerOrganizationId,
      activePlanKey: "starter",
      creditPlanKey: "starter",
      updatedByUserId: userId,
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.insert("whiteLabelPartnerOrganizationCreditPeriods", {
      partnerOrganizationId,
      planKey: "starter",
      periodStart: now,
      periodEnd: now + 30 * DAY,
      grantedCredits: PLAN_CATALOG.starter.monthlyCredits,
      usedCredits: 400,
      createdAt: now,
      updatedAt: now,
    });
    return { userId, partnerOrganizationId };
  });

  await t.run((ctx) =>
    applyPartnerOrganizationEntitlements(ctx, {
      partnerOrganizationId: seeded.partnerOrganizationId,
      maxAgents: 4,
      monthlyCredits: 9000,
      actorUserId: seeded.userId,
    }),
  );

  const { plan, balance } = await t.run(async (ctx) => ({
    plan: await ctx.db
      .query("whiteLabelPartnerOrganizationPlans")
      .withIndex("by_partnerOrganizationId", (q) =>
        q.eq("partnerOrganizationId", seeded.partnerOrganizationId),
      )
      .unique(),
    balance: await getPartnerCreditBalance(ctx, seeded.partnerOrganizationId),
  }));
  expect(plan?.activePlanKey).toBe("starter");
  expect(plan?.maxAgents).toBe(4);
  expect(plan?.monthlyCredits).toBe(9000);
  expect(balance.period?.grantedCredits).toBe(9000);
  expect(balance.remainingCredits).toBe(8600);
});

test("partner model assignment updates existing organization agents", async () => {
  const t = convexTest(schema, modules);
  const seeded = await t.run(async (ctx) => {
    const now = Date.now();
    const userId = await ctx.db.insert("users", {
      workosUserId: "user_owner",
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
    const teamId = await ctx.db.insert("teams", {
      type: "organizational",
      name: "Customer",
      ownerId: userId,
      workosOrgId: "org_customer",
      createdAt: now,
      updatedAt: now,
    });
    const partnerOrganizationId = await ctx.db.insert(
      "whiteLabelPartnerOrganizations",
      {
        partnerId,
        teamId,
        status: "active",
        createdByUserId: userId,
        createdAt: now,
        updatedAt: now,
      },
    );
    await ctx.db.insert("whiteLabelPartnerOrganizationPlans", {
      partnerOrganizationId,
      activePlanKey: "free",
      creditPlanKey: "free",
      updatedByUserId: userId,
      createdAt: now,
      updatedAt: now,
    });
    const agentId = await ctx.db.insert("agents", {
      name: "Support",
      provider: "ilmu",
      model: "ilmu-mini-v3.3",
      systemPrompt: "Help customers.",
      templateKey: "support",
      fileSize: 0,
      userId: "user_owner",
      orgId: "org_customer",
      createdAt: now,
      updatedAt: now,
    });
    return { userId, partnerOrganizationId, agentId };
  });

  await t.run((ctx) =>
    applyPartnerOrganizationEntitlements(ctx, {
      partnerOrganizationId: seeded.partnerOrganizationId,
      modelId: "deepseek/deepseek-v4-flash",
      actorUserId: seeded.userId,
    }),
  );

  const { plan, agent } = await t.run(async (ctx) => ({
    plan: await ctx.db
      .query("whiteLabelPartnerOrganizationPlans")
      .withIndex("by_partnerOrganizationId", (q) =>
        q.eq("partnerOrganizationId", seeded.partnerOrganizationId),
      )
      .unique(),
    agent: await ctx.db.get(seeded.agentId),
  }));
  expect(plan?.modelId).toBe("deepseek/deepseek-v4-flash");
  expect(agent?.model).toBe("deepseek/deepseek-v4-flash");
  expect(agent?.provider).toBe("openrouter");
});
