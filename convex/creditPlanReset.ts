import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import {
  getOrCreateCurrentPeriod,
  getTopUpRemaining,
} from "./creditPeriodPool";
import { insertCreditLog } from "./creditLogs";
import { PLAN_CATALOG } from "./planCatalog";

export async function resetCurrentPeriodToFreePlan(
  ctx: MutationCtx,
  userId: Id<"users">,
): Promise<void> {
  const current = await getOrCreateCurrentPeriod(ctx, userId);
  const monthlyBefore = current.grantedCredits - current.usedCredits;
  const purchasedRemaining = await getTopUpRemaining(ctx, userId);
  const grantedCredits = PLAN_CATALOG.free.monthlyCredits;

  if (
    current.planKey === "free" &&
    current.grantedCredits === grantedCredits &&
    current.usedCredits === 0
  ) {
    return;
  }

  await ctx.db.patch(current._id, {
    grantedCredits,
    usedCredits: 0,
    planKey: "free",
    updatedAt: Date.now(),
  });

  await insertCreditLog(ctx, {
    orgId: "",
    userId,
    periodId: current._id,
    eventType: "adjustment",
    label: "Plan downgraded",
    amount: grantedCredits - monthlyBefore,
    balanceBefore: monthlyBefore + purchasedRemaining,
    balanceAfter: grantedCredits + purchasedRemaining,
    monthlyCreditsBefore: monthlyBefore,
    monthlyCreditsAfter: grantedCredits,
    purchasedCreditsBefore: purchasedRemaining,
    purchasedCreditsAfter: purchasedRemaining,
    reason: "Subscription downgraded and reset to Free plan",
  });
}
