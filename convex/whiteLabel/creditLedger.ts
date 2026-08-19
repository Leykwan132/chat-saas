import type { MutationCtx, QueryCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import { PLAN_CATALOG, type PlanKey } from "../planCatalog";
import { deductPartnerOrganizationCredits } from "./partnerCreditModel";

type DbCtx = QueryCtx | MutationCtx;

export async function getLatestPartnerCreditPeriod(
  ctx: DbCtx,
  partnerOrganizationId: Id<"whiteLabelPartnerOrganizations">,
) {
  return await ctx.db
    .query("whiteLabelPartnerOrganizationCreditPeriods")
    .withIndex("by_partnerOrganizationId_and_periodStart", (q) =>
      q.eq("partnerOrganizationId", partnerOrganizationId),
    )
    .order("desc")
    .first();
}

export async function getPartnerCreditBalance(
  ctx: DbCtx,
  partnerOrganizationId: Id<"whiteLabelPartnerOrganizations">,
) {
  const [period, balance] = await Promise.all([
    getLatestPartnerCreditPeriod(ctx, partnerOrganizationId),
    ctx.db
      .query("whiteLabelPartnerOrganizationCreditBalances")
      .withIndex("by_partnerOrganizationId", (q) =>
        q.eq("partnerOrganizationId", partnerOrganizationId),
      )
      .unique(),
  ]);
  const monthlyCredits = period === null ? 0 : period.grantedCredits - period.usedCredits;
  const manualCredits = balance === null ? 0 : balance.manualGrantedCredits - balance.manualUsedCredits;
  return { period, balance, monthlyCredits, manualCredits, remainingCredits: monthlyCredits + manualCredits };
}

export async function grantPartnerOrganizationCredits(
  ctx: MutationCtx,
  args: {
    partnerOrganizationId: Id<"whiteLabelPartnerOrganizations">;
    credits: number;
    grantedByUserId: Id<"users">;
  },
) {
  if (!Number.isSafeInteger(args.credits) || args.credits <= 0) {
    throw new Error("Credits must be a positive whole number.");
  }
  const now = Date.now();
  const balance = await ctx.db
    .query("whiteLabelPartnerOrganizationCreditBalances")
    .withIndex("by_partnerOrganizationId", (q) =>
      q.eq("partnerOrganizationId", args.partnerOrganizationId),
    )
    .unique();
  if (balance === null) {
    await ctx.db.insert("whiteLabelPartnerOrganizationCreditBalances", {
      partnerOrganizationId: args.partnerOrganizationId,
      manualGrantedCredits: args.credits,
      manualUsedCredits: 0,
      grantCount: 1,
      lastGrantAt: now,
      updatedAt: now,
    });
  } else {
    await ctx.db.patch(balance._id, {
      manualGrantedCredits: balance.manualGrantedCredits + args.credits,
      grantCount: balance.grantCount + 1,
      lastGrantAt: now,
      updatedAt: now,
    });
  }
  await ctx.db.insert("whiteLabelPartnerOrganizationCreditGrants", {
    partnerOrganizationId: args.partnerOrganizationId,
    grantedCredits: args.credits,
    usedCredits: 0,
    grantedByUserId: args.grantedByUserId,
    createdAt: now,
    updatedAt: now,
  });
  await ctx.db.insert("whiteLabelPartnerOrganizationCreditLedger", {
    partnerOrganizationId: args.partnerOrganizationId,
    event: "manual_grant",
    credits: args.credits,
    actorUserId: args.grantedByUserId,
    createdAt: now,
  });
}

export async function createPartnerCreditPeriod(
  ctx: MutationCtx,
  args: {
    partnerOrganizationId: Id<"whiteLabelPartnerOrganizations">;
    planKey: PlanKey;
    periodStart: number;
    periodEnd: number;
    actorUserId: Id<"users">;
  },
) {
  const now = Date.now();
  const grantedCredits = PLAN_CATALOG[args.planKey].monthlyCredits;
  await ctx.db.insert("whiteLabelPartnerOrganizationCreditPeriods", {
    partnerOrganizationId: args.partnerOrganizationId,
    planKey: args.planKey,
    periodStart: args.periodStart,
    periodEnd: args.periodEnd,
    grantedCredits,
    usedCredits: 0,
    createdAt: now,
    updatedAt: now,
  });
  await ctx.db.insert("whiteLabelPartnerOrganizationCreditLedger", {
    partnerOrganizationId: args.partnerOrganizationId,
    event: "monthly_allowance",
    credits: grantedCredits,
    actorUserId: args.actorUserId,
    createdAt: now,
  });
}

export async function ensureCurrentPartnerCreditPeriod(
  ctx: MutationCtx,
  args: { partnerOrganizationId: Id<"whiteLabelPartnerOrganizations">; actorUserId: Id<"users"> },
) {
  const current = await getLatestPartnerCreditPeriod(ctx, args.partnerOrganizationId);
  const now = Date.now();
  if (current !== null && current.periodEnd > now) return current;
  const plan = await ctx.db.query("whiteLabelPartnerOrganizationPlans").withIndex("by_partnerOrganizationId", (q) => q.eq("partnerOrganizationId", args.partnerOrganizationId)).unique();
  if (plan === null) throw new Error("Customer organization plan not found.");
  const creditPlanKey = plan.pendingCreditPlanKey && (plan.pendingCreditPlanEffectiveAt ?? 0) <= now ? plan.pendingCreditPlanKey : plan.creditPlanKey;
  if (creditPlanKey !== plan.creditPlanKey || plan.pendingCreditPlanKey !== undefined) {
    await ctx.db.patch(plan._id, { creditPlanKey, pendingCreditPlanKey: undefined, pendingCreditPlanEffectiveAt: undefined, updatedAt: now });
  }
  const periodStart = current?.periodEnd ?? now;
  const periodEnd = periodStart + 30 * 24 * 60 * 60 * 1000;
  await createPartnerCreditPeriod(ctx, { partnerOrganizationId: args.partnerOrganizationId, planKey: creditPlanKey, periodStart, periodEnd, actorUserId: args.actorUserId });
  return await getLatestPartnerCreditPeriod(ctx, args.partnerOrganizationId);
}

export async function deductPartnerOrganizationCreditBalance(
  ctx: MutationCtx,
  args: { partnerOrganizationId: Id<"whiteLabelPartnerOrganizations">; credits: number },
) {
  const balance = await getPartnerCreditBalance(ctx, args.partnerOrganizationId);
  const deduction = deductPartnerOrganizationCredits({
    monthlyCredits: balance.monthlyCredits,
    manualGrantCredits: balance.manualCredits,
    credits: args.credits,
  });
  if (balance.period !== null && deduction.monthlyCredits > 0) {
    await ctx.db.patch(balance.period._id, {
      usedCredits: balance.period.usedCredits + deduction.monthlyCredits,
      updatedAt: Date.now(),
    });
  }
  if (deduction.manualGrantCredits > 0) {
    if (balance.balance === null) throw new Error("Manual credit balance not found.");
    await ctx.db.patch(balance.balance._id, {
      manualUsedCredits: balance.balance.manualUsedCredits + deduction.manualGrantCredits,
      updatedAt: Date.now(),
    });
  }
  await ctx.db.insert("whiteLabelPartnerOrganizationCreditLedger", {
    partnerOrganizationId: args.partnerOrganizationId,
    event: "usage_deduction",
    credits: -args.credits,
    createdAt: Date.now(),
  });
}
