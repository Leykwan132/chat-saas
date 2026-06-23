import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import {
  getOrCreateCurrentPeriod,
} from "./creditPeriodPool";

export type CreditDeductionResult = {
  monthlyDeducted: number;
  topUpDeducted: number;
  periodId?: Id<"userCreditPeriods">;
  topUpAllocations: Array<{ topUpEntryId: Id<"topUpEntries">; amount: number }>;
};

/** Create a top-up entry (granted/used quota, carried forward across cycles). */
export async function createTopUpEntry(
  ctx: MutationCtx,
  userId: Id<"users">,
  args: {
    grantedCredits: number;
    label?: string;
    stripePaymentIntentId?: string;
  },
): Promise<Id<"topUpEntries">> {
  const now = Date.now();
  return await ctx.db.insert("topUpEntries", {
    userId,
    grantedCredits: args.grantedCredits,
    usedCredits: 0,
    label: args.label,
    stripePaymentIntentId: args.stripePaymentIntentId,
    createdAt: now,
    updatedAt: now,
  });
}

/**
 * Deduct `cost` credits from the user's monthly quota first, then top-up
 * entries FIFO by createdAt. Throws "Insufficient credits" if both are
 * exhausted — because this runs inside a Convex mutation transaction, the
 * throw rolls back any partial `usedCredits` patch, so no partial deduction
 * and no audit log are written on failure (per the quota design).
 */
export async function deductFromUserQuota(
  ctx: MutationCtx,
  userId: Id<"users">,
  cost: number,
): Promise<CreditDeductionResult> {
  if (cost <= 0) {
    return { monthlyDeducted: 0, topUpDeducted: 0, topUpAllocations: [] };
  }

  const period = await getOrCreateCurrentPeriod(ctx, userId);
  const monthlyRemaining = period.grantedCredits - period.usedCredits;
  const fromMonthly = Math.min(monthlyRemaining, cost);

  let remaining = cost;
  const result: CreditDeductionResult = {
    monthlyDeducted: 0,
    topUpDeducted: 0,
    periodId: undefined,
    topUpAllocations: [],
  };

  if (fromMonthly > 0) {
    await ctx.db.patch(period._id, {
      usedCredits: period.usedCredits + fromMonthly,
      updatedAt: Date.now(),
    });
    result.monthlyDeducted = fromMonthly;
    result.periodId = period._id;
    remaining -= fromMonthly;
  }

  if (remaining > 0) {
    const topUps = (
      await ctx.db
        .query("topUpEntries")
        .withIndex("by_userId_and_createdAt", (q) => q.eq("userId", userId))
        .collect()
    )
      .filter((e) => (e.grantedCredits ?? 0) - (e.usedCredits ?? 0) > 0)
      .sort((a, b) => a.createdAt - b.createdAt);

    for (const entry of topUps) {
      if (remaining <= 0) break;
      const leftover = (entry.grantedCredits ?? 0) - (entry.usedCredits ?? 0);
      const take = Math.min(leftover, remaining);
      await ctx.db.patch(entry._id, {
        usedCredits: (entry.usedCredits ?? 0) + take,
        updatedAt: Date.now(),
      });
      result.topUpDeducted += take;
      result.topUpAllocations.push({ topUpEntryId: entry._id, amount: take });
      remaining -= take;
    }
  }

  if (remaining > 0) {
    throw new Error("Insufficient credits");
  }

  return result;
}
