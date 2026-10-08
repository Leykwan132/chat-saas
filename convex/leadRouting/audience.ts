import { v } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import { internalQuery, type QueryCtx, type MutationCtx } from "../_generated/server";

export const aiReplyAudienceValidator = v.union(v.literal("all"), v.literal("ads"), v.literal("new"));

export async function isConversationInAiReplyAudience(
  ctx: QueryCtx | MutationCtx,
  conversation: Doc<"conversations">,
): Promise<boolean> {
  if (conversation.service === "playground") return true;
  if (!conversation.assignedAgentId) return false;
  const settings = await ctx.db.query("leadAssignmentSettings")
    .withIndex("by_agentId", (q) => q.eq("agentId", conversation.assignedAgentId!)).unique();
  if (!settings || !settings.aiReplyAudience || settings.aiReplyAudience === "all") return true;
  if (!conversation.customerId) return false;
  const customer = await ctx.db.get(conversation.customerId);
  if (!customer) return false;
  if (settings.aiReplyAudience === "ads") {
    return customer.latestAdReferral !== undefined ||
      customer.firstReferral?.referral.sourceType === "ad" ||
      customer.latestReferral?.referral.sourceType === "ad";
  }
  if (settings.aiNewCustomersSince === undefined) throw new Error("New customer audience requires a publication date");
  return customer._creationTime > settings.aiNewCustomersSince;
}

export const canReplyToConversation = internalQuery({
  args: { conversationId: v.id("conversations") },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId);
    return conversation !== null && await isConversationInAiReplyAudience(ctx, conversation);
  },
});
