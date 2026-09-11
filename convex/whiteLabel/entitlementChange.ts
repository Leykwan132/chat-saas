import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { parsePartnerLimit } from "../../shared/partnerEntitlementLimits";
import { getLatestPartnerCreditPeriod } from "./creditLedger";
import {
  applyAssignedModelToOrganizationAgents,
  parsePartnerAgentModel,
} from "./partnerAgentModel";
import { type PlanChangeTiming } from "./planChange";
import { getWhiteLabelPlanRecord } from "./planResolver";

export async function applyPartnerOrganizationEntitlements(
  ctx: MutationCtx,
  args: {
    partnerOrganizationId: Id<"whiteLabelPartnerOrganizations">;
    maxAgents?: number;
    monthlyCredits?: number;
    modelId?: string;
    timing?: PlanChangeTiming;
    actorUserId: Id<"users">;
  },
) {
  if (
    args.maxAgents === undefined &&
    args.monthlyCredits === undefined &&
    args.modelId === undefined
  ) {
    throw new Error("Set agents, monthly credits, or model.");
  }
  const plan = await getWhiteLabelPlanRecord(ctx, args.partnerOrganizationId);
  if (plan === null) throw new Error("Customer organization plan not found.");
  const now = Date.now();
  const maxAgents =
    args.maxAgents === undefined
      ? undefined
      : parsePartnerLimit(args.maxAgents, "Agents");
  const monthlyCredits =
    args.monthlyCredits === undefined
      ? undefined
      : parsePartnerLimit(args.monthlyCredits, "Monthly credits");
  const modelId =
    args.modelId === undefined
      ? undefined
      : parsePartnerAgentModel(args.modelId);
  const scheduleLimits =
    args.timing === "next_period" && monthlyCredits !== undefined;

  if (scheduleLimits) {
    const period = await getLatestPartnerCreditPeriod(
      ctx,
      args.partnerOrganizationId,
    );
    if (period === null) {
      throw new Error("Customer organization credit period not found.");
    }
    await ctx.db.patch(plan._id, {
      ...(maxAgents === undefined
        ? {}
        : {
            maxAgents,
            pendingMaxAgents: undefined,
            pendingMaxAgentsEffectiveAt: undefined,
          }),
      pendingMonthlyCredits: monthlyCredits,
      pendingMonthlyCreditsEffectiveAt: period.periodEnd,
      ...(modelId === undefined ? {} : { modelId }),
      updatedByUserId: args.actorUserId,
      updatedAt: now,
    });
    if (modelId !== undefined) {
      await applyAssignedModelToOrganizationAgents(
        ctx,
        args.partnerOrganizationId,
        modelId,
      );
    }
    return;
  }

  await ctx.db.patch(plan._id, {
    ...(maxAgents === undefined
      ? {}
      : {
          maxAgents,
          pendingMaxAgents: undefined,
          pendingMaxAgentsEffectiveAt: undefined,
        }),
    ...(monthlyCredits === undefined
      ? {}
      : {
          monthlyCredits,
          pendingMonthlyCredits: undefined,
          pendingMonthlyCreditsEffectiveAt: undefined,
        }),
    ...(modelId === undefined ? {} : { modelId }),
    updatedByUserId: args.actorUserId,
    updatedAt: now,
  });

  if (modelId !== undefined) {
    await applyAssignedModelToOrganizationAgents(
      ctx,
      args.partnerOrganizationId,
      modelId,
    );
  }

  if (monthlyCredits === undefined) return;
  const period = await getLatestPartnerCreditPeriod(
    ctx,
    args.partnerOrganizationId,
  );
  if (period === null) {
    throw new Error("Customer organization credit period not found.");
  }
  await ctx.db.patch(period._id, {
    grantedCredits: monthlyCredits,
    updatedAt: now,
  });
  await ctx.db.insert("whiteLabelPartnerOrganizationCreditLedger", {
    partnerOrganizationId: args.partnerOrganizationId,
    event: "plan_change",
    credits: monthlyCredits - period.grantedCredits,
    actorUserId: args.actorUserId,
    createdAt: now,
  });
}
