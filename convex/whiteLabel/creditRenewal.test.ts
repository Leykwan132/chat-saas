/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { afterEach, expect, test, vi } from "vitest";
import { internal } from "../_generated/api";
import schema from "../schema";
import { PLAN_CATALOG } from "../planCatalog";
import {
  createPartnerCreditPeriod,
  getLatestPartnerCreditPeriod,
} from "./creditLedger";

const modules = import.meta.glob("/convex/**/*.ts");
const DAY = 24 * 60 * 60 * 1000;
const start = Date.UTC(2026, 8, 7);

afterEach(() => {
  vi.useRealTimers();
});

async function seedOrganization(periodEnd: number) {
  vi.useFakeTimers();
  vi.setSystemTime(start);
  const t = convexTest(schema, modules);
  const seeded = await t.run(async (ctx) => {
    const userId = await ctx.db.insert("users", {
      workosUserId: "renewal_owner",
      email: "renewal@partner.test",
      createdAt: start,
      updatedAt: start,
    });
    const partnerId = await ctx.db.insert("whiteLabelPartners", {
      name: "Renewal Partner",
      status: "active",
      createdAt: start,
      updatedAt: start,
    });
    const teamId = await ctx.db.insert("teams", {
      type: "organizational",
      name: "Renewal Customer",
      ownerId: userId,
      workosOrgId: "org_renewal",
      createdAt: start,
      updatedAt: start,
    });
    const partnerOrganizationId = await ctx.db.insert(
      "whiteLabelPartnerOrganizations",
      {
        partnerId,
        teamId,
        status: "active",
        createdByUserId: userId,
        createdAt: start,
        updatedAt: start,
      },
    );
    await ctx.db.insert("whiteLabelPartnerOrganizationPlans", {
      partnerOrganizationId,
      activePlanKey: "starter",
      creditPlanKey: "starter",
      updatedByUserId: userId,
      createdAt: start,
      updatedAt: start,
    });
    const periodId = await createPartnerCreditPeriod(ctx, {
      partnerOrganizationId,
      planKey: "starter",
      periodStart: periodEnd - 30 * DAY,
      periodEnd,
      actorUserId: userId,
    });
    return { partnerOrganizationId, periodId };
  });
  return { t, ...seeded };
}

test("period creation schedules its automatic renewal", async () => {
  const { t } = await seedOrganization(start + 30 * DAY);
  const scheduled = await t.run(async (ctx) =>
    ctx.db.system.query("_scheduled_functions").take(10),
  );
  expect(scheduled).toHaveLength(1);
  expect(scheduled[0].name).toContain("renewOrganizationCredits");
  expect(scheduled[0].scheduledTime).toBe(start + 30 * DAY);
});

test("automatic renewal applies a pending plan once and schedules the next cycle", async () => {
  const periodEnd = start + 30 * DAY;
  const { t, partnerOrganizationId, periodId } =
    await seedOrganization(periodEnd);
  await t.run(async (ctx) => {
    const plan = await ctx.db
      .query("whiteLabelPartnerOrganizationPlans")
      .withIndex("by_partnerOrganizationId", (q) =>
        q.eq("partnerOrganizationId", partnerOrganizationId),
      )
      .unique();
    await ctx.db.patch(plan!._id, {
      activePlanKey: "growth",
      pendingCreditPlanKey: "growth",
      pendingCreditPlanEffectiveAt: periodEnd,
    });
  });
  vi.setSystemTime(periodEnd);

  await t.mutation(
    internal.whiteLabel.creditRenewal.renewOrganizationCredits,
    { partnerOrganizationId, expectedPeriodId: periodId },
  );
  await t.mutation(
    internal.whiteLabel.creditRenewal.renewOrganizationCredits,
    { partnerOrganizationId, expectedPeriodId: periodId },
  );

  const result = await t.run(async (ctx) => {
    const periods = await ctx.db
      .query("whiteLabelPartnerOrganizationCreditPeriods")
      .withIndex("by_partnerOrganizationId_and_periodStart", (q) =>
        q.eq("partnerOrganizationId", partnerOrganizationId),
      )
      .collect();
    const plan = await ctx.db
      .query("whiteLabelPartnerOrganizationPlans")
      .withIndex("by_partnerOrganizationId", (q) =>
        q.eq("partnerOrganizationId", partnerOrganizationId),
      )
      .unique();
    return { periods, plan };
  });
  expect(result.periods).toHaveLength(2);
  expect(result.periods[1]).toMatchObject({
    planKey: "growth",
    periodStart: periodEnd,
    periodEnd: periodEnd + 30 * DAY,
    grantedCredits: PLAN_CATALOG.growth.monthlyCredits,
    usedCredits: 0,
  });
  expect(result.plan?.creditPlanKey).toBe("growth");
  expect(result.plan?.pendingCreditPlanKey).toBeUndefined();
});

test("a delayed fallback skips expired cycles without creating stale periods", async () => {
  const oldPeriodEnd = start - 75 * DAY;
  const { t, partnerOrganizationId, periodId } =
    await seedOrganization(oldPeriodEnd);

  await t.mutation(
    internal.whiteLabel.creditRenewal.renewOrganizationCredits,
    { partnerOrganizationId, expectedPeriodId: periodId },
  );

  const latest = await t.run((ctx) =>
    getLatestPartnerCreditPeriod(ctx, partnerOrganizationId),
  );
  expect(latest).toMatchObject({
    periodStart: oldPeriodEnd + 60 * DAY,
    periodEnd: oldPeriodEnd + 90 * DAY,
  });
});
