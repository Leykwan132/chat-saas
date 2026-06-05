import { v } from "convex/values";
import { internalQuery } from "./_generated/server";

export const getFollowUpWorkerContext = internalQuery({
  args: {
    customerId: v.id("customers"),
    ruleId: v.id("followUpRules"),
  },
  handler: async (ctx, args) => {
    const customer = await ctx.db.get(args.customerId);
    if (!customer) return null;
    const rule = await ctx.db.get(args.ruleId);
    if (!rule) return null;
    if (!customer.lastConversationId) return null;
    const conversation = await ctx.db.get(customer.lastConversationId);
    if (!conversation) return null;
    const channel = await ctx.db.get(rule.channelId);
    if (!channel) return null;
    return {
      customer,
      rule,
      conversation,
      channel,
    };
  },
});
