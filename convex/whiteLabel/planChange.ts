import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { type PlanKey } from "../planCatalog";
import { resolvePartnerMonthlyCredits } from "../../shared/partnerEntitlementLimits";
import { getLatestPartnerCreditPeriod } from "./creditLedger";

export const planChangeTimingValidator = v.union(
  v.literal("immediate"),
  v.literal("next_period"),
);

export type PlanChangeTiming = "immediate" | "next_period";

export async function applyPartnerOrganizationPlanChange(
  ctx: MutationCtx,
  args: {
    partnerOrganizationId: Id<"whiteLabelPartnerOrganizations">;
    planKey: PlanKey;
    timing: PlanChangeTiming;
    actorUserId: Id<"users">;
  },
) {
  const [plan, period] = await Promise.all([
    ctx.db
      .query("whiteLabelPartnerOrganizationPlans")
      .withIndex("by_partnerOrganizationId", (q) =>
        q.eq("partnerOrganizationId", args.partnerOrganizationId),
      )
      .unique(),
    getLatestPartnerCreditPeriod(ctx, args.partnerOrganizationId),
  ]);
  if (plan === null) throw new Error("Customer organization plan not found.");
  if (period === null) {
    throw new Error("Customer organization credit period not found.");
  }
  const now = Date.now();

  if (args.timing === "immediate") {
    const grantedCredits = resolvePartnerMonthlyCredits(
      args.planKey,
      plan.monthlyCredits,
    );
    await ctx.db.patch(plan._id, {
      activePlanKey: args.planKey,
      creditPlanKey: args.planKey,
      pendingCreditPlanKey: undefined,
      pendingCreditPlanEffectiveAt: undefined,
      updatedByUserId: args.actorUserId,
      updatedAt: now,
    });
    await ctx.db.patch(period._id, {
      planKey: args.planKey,
      grantedCredits,
      updatedAt: now,
    });
    await ctx.db.insert("whiteLabelPartnerOrganizationCreditLedger", {
      partnerOrganizationId: args.partnerOrganizationId,
      event: "plan_change",
      credits: grantedCredits - period.grantedCredits,
      actorUserId: args.actorUserId,
      createdAt: now,
    });
  } else {
    const revertsToCurrentCreditPlan = args.planKey === plan.creditPlanKey;
    await ctx.db.patch(plan._id, {
      activePlanKey: args.planKey,
      pendingCreditPlanKey: revertsToCurrentCreditPlan ? undefined : args.planKey,
      pendingCreditPlanEffectiveAt: revertsToCurrentCreditPlan
        ? undefined
        : period.periodEnd,
      updatedByUserId: args.actorUserId,
      updatedAt: now,
    });
  }

  await ctx.db.insert("whiteLabelPartnerOrganizationPlanAssignments", {
    partnerOrganizationId: args.partnerOrganizationId,
    planKey: args.planKey,
    appliesAt: args.timing === "immediate" ? now : period.periodEnd,
    assignedByUserId: args.actorUserId,
    createdAt: now,
  });
}
