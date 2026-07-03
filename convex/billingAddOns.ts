import { query } from "./_generated/server";
import { EXTRA_CREDITS_PACKS } from "../shared/extraCreditsCatalog";
import { getBillingEntityForUser } from "./plans";

const TOP_UP_HISTORY_LIMIT = 10;

function getPriceForCredits(credits: number): number | null {
  return EXTRA_CREDITS_PACKS.find((pack) => pack.credits === credits)?.priceRm ?? null;
}

export const listAddOnPurchaseHistory = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_workosUserId", (q) => q.eq("workosUserId", identity.subject))
      .unique();
    if (!user) {
      return [];
    }

    const { billingUser } = await getBillingEntityForUser(ctx, user);
    const logs = await ctx.db
      .query("creditLogs")
      .withIndex("by_userId_and_eventType_and_createdAt", (q) =>
        q.eq("userId", billingUser._id).eq("eventType", "top_up"),
      )
      .order("desc")
      .take(TOP_UP_HISTORY_LIMIT);

    return logs.map((log) => ({
      id: log._id,
      purchasedAt: log.createdAt,
      credits: log.amount,
      priceRm: getPriceForCredits(log.amount),
      label: log.label ?? null,
      stripePaymentIntentId: log.stripePaymentIntentId ?? null,
    }));
  },
});
