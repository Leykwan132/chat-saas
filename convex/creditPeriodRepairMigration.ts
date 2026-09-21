import { Migrations } from "@convex-dev/migrations";
import { components, internal } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";
import type { Id } from "./_generated/dataModel";
import schema from "./schema";

const targetUserId = "qh7677m2kbx0mbd5tze569y3qn8bnd49" as Id<"users">;
const targetPeriodStart = 1_788_220_800_000;
const businessMonthlyCredits = 20_000;

const migrations = new Migrations<DataModel, typeof schema>(components.migrations, {
  schema,
});

export function buildBusinessCreditPeriodRepairPatch(usageCredits: number[]) {
  return {
    grantedCredits: businessMonthlyCredits,
    usedCredits: usageCredits.reduce((total, credits) => total + credits, 0),
    planKey: "business" as const,
  };
}

export const repairBusinessCreditPeriod = migrations.define({
  table: "userCreditPeriods",
  customRange: (query) =>
    query.withIndex("by_userId_and_periodStart", (q) =>
      q.eq("userId", targetUserId).eq("periodStart", targetPeriodStart),
    ),
  migrateOne: async (ctx, period) => {
    const usageCredits: number[] = [];
    for await (const log of ctx.db
      .query("creditLogs")
      .withIndex("by_userId_and_eventType_and_createdAt", (q) =>
        q
          .eq("userId", period.userId)
          .eq("eventType", "usage")
          .gte("createdAt", period.periodStart)
          .lt("createdAt", period.periodEnd),
      )) {
      if (log.periodId === period._id) {
        usageCredits.push(log.creditCost ?? Math.abs(log.amount));
      }
    }
    await ctx.db.patch(period._id, {
      ...buildBusinessCreditPeriodRepairPatch(usageCredits),
      updatedAt: Date.now(),
    });
  },
});

export const runRepairBusinessCreditPeriod = migrations.runner(
  internal.creditPeriodRepairMigration.repairBusinessCreditPeriod,
);
