import type { MutationCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import { addPartnerUsage } from "./partnerUsageModel";

export async function recordPartnerUsage(
  ctx: MutationCtx,
  args: { partnerId: Id<"whiteLabelPartners">; totalTokens: number; costUsd: number },
) {
  const current = await ctx.db
    .query("whiteLabelPartnerUsageTotals")
    .withIndex("by_partnerId", (q) => q.eq("partnerId", args.partnerId))
    .unique();
  const next = addPartnerUsage(current ?? { totalTokens: 0, totalCostUsd: 0, requestCount: 0 }, args);
  if (current === null) {
    await ctx.db.insert("whiteLabelPartnerUsageTotals", { partnerId: args.partnerId, ...next, updatedAt: Date.now() });
    return;
  }
  await ctx.db.patch(current._id, { ...next, updatedAt: Date.now() });
}
