import { v } from "convex/values";
import { internalMutation } from "../_generated/server";
import {
  ensureCurrentPartnerCreditPeriod,
  getLatestPartnerCreditPeriod,
} from "./creditLedger";

export const renewOrganizationCredits = internalMutation({
  args: {
    partnerOrganizationId: v.id("whiteLabelPartnerOrganizations"),
    expectedPeriodId: v.id("whiteLabelPartnerOrganizationCreditPeriods"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const expectedPeriod = await ctx.db.get(args.expectedPeriodId);
    if (
      expectedPeriod === null ||
      expectedPeriod.partnerOrganizationId !== args.partnerOrganizationId ||
      expectedPeriod.periodEnd > Date.now()
    ) {
      return null;
    }
    const latestPeriod = await getLatestPartnerCreditPeriod(
      ctx,
      args.partnerOrganizationId,
    );
    if (latestPeriod?._id !== expectedPeriod._id) return null;
    await ensureCurrentPartnerCreditPeriod(ctx, {
      partnerOrganizationId: args.partnerOrganizationId,
    });
    return null;
  },
});
