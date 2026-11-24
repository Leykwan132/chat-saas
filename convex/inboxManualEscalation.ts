import { notifyPushEscalation } from "./pushNotifications/events";
import { v } from "convex/values";
import { mutation } from "./triggers";
import type { MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import { getAuthContext } from "./authUtils";
import { permissionsForCurrentUser } from "./appointmentBooking/access";
import { Permission } from "../shared/permissions";
import { markConversationAnalyticsDirty } from "./analyticsDirtyRequest";

async function escalationAccess(
  ctx: MutationCtx,
  conversationId: Id<"conversations">,
) {
  const auth = await getAuthContext(ctx);
  const conversation = await ctx.db.get(conversationId);
  const isPersonal = !auth.orgId || auth.orgId === "personal";
  if (
    !conversation ||
    (isPersonal
      ? (conversation.orgId !== "" && conversation.orgId !== "personal") ||
        conversation.userId !== auth.userId
      : conversation.orgId !== auth.orgId)
  )
    throw new Error("Conversation not found");
  const permissions = await permissionsForCurrentUser(ctx);
  if (!permissions.includes(Permission.CHATS_ASSIGN))
    throw new Error("Forbidden");
  if (conversation.status === "closed")
    throw new Error("Cannot escalate a closed conversation");
  return { auth, conversation };
}

export const escalate = mutation({
  args: { conversationId: v.id("conversations") },
  returns: v.null(),
  handler: async (ctx, { conversationId }) => {
    const { auth, conversation } = await escalationAccess(ctx, conversationId);
    if (conversation.escalation) return null;
    const escalation = {
      question: "Human attention requested",
      context: "Manually escalated by a team member.",
      escalatedAt: Date.now(),
    };
    await ctx.db.patch(conversationId, {
      status: "requires_user_input",
      assignToAiAgent: false,
      escalation,
      updatedAt: escalation.escalatedAt,
    });
    await ctx.runMutation(internal.conversationLogs.logEvent, {
      conversationId,
      action: "escalation_raised",
      actor: { type: "user", userId: auth.userId, name: auth.identity.name },
      metadata: { question: escalation.question, context: escalation.context },
    });
    if (conversation.assignedAgentId)
      await notifyPushEscalation(
        ctx,
        conversation.assignedAgentId,
        conversationId,
      );
    await markConversationAnalyticsDirty(ctx, { conversationId });
    return null;
  },
});

export const deescalate = mutation({
  args: { conversationId: v.id("conversations") },
  returns: v.null(),
  handler: async (ctx, { conversationId }) => {
    const { auth, conversation } = await escalationAccess(ctx, conversationId);
    if (!conversation.escalation) return null;
    await ctx.db.patch(conversationId, {
      status: "open",
      escalation: undefined,
      assignToAiAgent: true,
      updatedAt: Date.now(),
    });
    for (const action of conversation.assignToAiAgent
      ? (["escalation_resolved"] as const)
      : (["escalation_resolved", "ai_enabled"] as const)) {
      await ctx.runMutation(internal.conversationLogs.logEvent, {
        conversationId,
        action,
        actor: { type: "user", userId: auth.userId, name: auth.identity.name },
      });
    }
    await markConversationAnalyticsDirty(ctx, { conversationId });
    return null;
  },
});
