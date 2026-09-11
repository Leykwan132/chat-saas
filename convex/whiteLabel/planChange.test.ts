/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import schema from "../schema";
import { PLAN_CATALOG } from "../planCatalog";
import { getPartnerCreditBalance } from "./creditLedger";
import { applyPartnerOrganizationPlanChange } from "./planChange";

const modules = import.meta.glob("/convex/**/*.ts");
const DAY = 24 * 60 * 60 * 1000;

async function seedStarterOrganization() {
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
      { partnerId, teamId, status: "active", createdByUserId: userId, createdAt: now, updatedAt: now },
    );
    await ctx.db.insert("whiteLabelPartnerOrganizationPlans", {
      partnerOrganizationId,
      activePlanKey: "starter",
      creditPlanKey: "starter",
      updatedByUserId: userId,
      createdAt: now,
      updatedAt: now,
    });
    const periodEnd = now + 30 * DAY;
    await ctx.db.insert("whiteLabelPartnerOrganizationCreditPeriods", {
      partnerOrganizationId,
      planKey: "starter",
      periodStart: now,
      periodEnd,
      grantedCredits: PLAN_CATALOG.starter.monthlyCredits,
      usedCredits: 500,
      createdAt: now,
      updatedAt: now,
    });
    return { userId, partnerOrganizationId, periodEnd };
  });
  return { t, ...seeded };
}

test("immediate plan change updates the current period and remaining credits now", async () => {
  const { t, userId, partnerOrganizationId } = await seedStarterOrganization();

  await t.run((ctx) =>
    applyPartnerOrganizationPlanChange(ctx, {
      partnerOrganizationId,
      planKey: "growth",
      timing: "immediate",
      actorUserId: userId,
    }),
  );

  const { plan, balance } = await t.run(async (ctx) => ({
    plan: await ctx.db
      .query("whiteLabelPartnerOrganizationPlans")
      .withIndex("by_partnerOrganizationId", (q) => q.eq("partnerOrganizationId", partnerOrganizationId))
      .unique(),
    balance: await getPartnerCreditBalance(ctx, partnerOrganizationId),
  }));
  expect(plan?.creditPlanKey).toBe("growth");
  expect(plan?.pendingCreditPlanKey).toBeUndefined();
  expect(balance.period?.grantedCredits).toBe(PLAN_CATALOG.growth.monthlyCredits);
  expect(balance.remainingCredits).toBe(PLAN_CATALOG.growth.monthlyCredits - 500);
});

test("next-period plan change leaves current credits alone and schedules the switch", async () => {
  const { t, userId, partnerOrganizationId, periodEnd } = await seedStarterOrganization();

  await t.run((ctx) =>
    applyPartnerOrganizationPlanChange(ctx, {
      partnerOrganizationId,
      planKey: "growth",
      timing: "next_period",
      actorUserId: userId,
    }),
  );

  const { plan, balance } = await t.run(async (ctx) => ({
    plan: await ctx.db
      .query("whiteLabelPartnerOrganizationPlans")
      .withIndex("by_partnerOrganizationId", (q) => q.eq("partnerOrganizationId", partnerOrganizationId))
      .unique(),
    balance: await getPartnerCreditBalance(ctx, partnerOrganizationId),
  }));
  expect(plan?.activePlanKey).toBe("growth");
  expect(plan?.creditPlanKey).toBe("starter");
  expect(plan?.pendingCreditPlanKey).toBe("growth");
  expect(plan?.pendingCreditPlanEffectiveAt).toBe(periodEnd);
  expect(balance.period?.grantedCredits).toBe(PLAN_CATALOG.starter.monthlyCredits);
  expect(balance.remainingCredits).toBe(PLAN_CATALOG.starter.monthlyCredits - 500);
});

test("immediate downgrade below used credits floors remaining at zero", async () => {
  const { t, userId, partnerOrganizationId } = await seedStarterOrganization();
  await t.run(async (ctx) => {
    const period = await ctx.db
      .query("whiteLabelPartnerOrganizationCreditPeriods")
      .withIndex("by_partnerOrganizationId_and_periodStart", (q) => q.eq("partnerOrganizationId", partnerOrganizationId))
      .first();
    await ctx.db.patch(period!._id, { usedCredits: 1500 });
  });

  await t.run((ctx) =>
    applyPartnerOrganizationPlanChange(ctx, {
      partnerOrganizationId,
      planKey: "free",
      timing: "immediate",
      actorUserId: userId,
    }),
  );

  const balance = await t.run((ctx) => getPartnerCreditBalance(ctx, partnerOrganizationId));
  expect(balance.period?.grantedCredits).toBe(PLAN_CATALOG.free.monthlyCredits);
  expect(balance.period?.usedCredits).toBe(1500);
  expect(balance.remainingCredits).toBe(0);
});

test("immediate plan change keeps a custom monthly credit override", async () => {
  const { t, userId, partnerOrganizationId } = await seedStarterOrganization();
  await t.run(async (ctx) => {
    const plan = await ctx.db
      .query("whiteLabelPartnerOrganizationPlans")
      .withIndex("by_partnerOrganizationId", (q) =>
        q.eq("partnerOrganizationId", partnerOrganizationId),
      )
      .unique();
    await ctx.db.patch(plan!._id, { monthlyCredits: 12500, maxAgents: 7 });
  });

  await t.run((ctx) =>
    applyPartnerOrganizationPlanChange(ctx, {
      partnerOrganizationId,
      planKey: "business",
      timing: "immediate",
      actorUserId: userId,
    }),
  );

  const { plan, balance } = await t.run(async (ctx) => ({
    plan: await ctx.db
      .query("whiteLabelPartnerOrganizationPlans")
      .withIndex("by_partnerOrganizationId", (q) =>
        q.eq("partnerOrganizationId", partnerOrganizationId),
      )
      .unique(),
    balance: await getPartnerCreditBalance(ctx, partnerOrganizationId),
  }));
  expect(plan?.activePlanKey).toBe("business");
  expect(plan?.maxAgents).toBe(7);
  expect(plan?.monthlyCredits).toBe(12500);
  expect(balance.period?.grantedCredits).toBe(12500);
  expect(balance.remainingCredits).toBe(12000);
});
