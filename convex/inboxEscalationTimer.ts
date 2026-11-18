import { v } from "convex/values";
import { query } from "./_generated/server";
import { getAuthContext } from "./authUtils";
import { permissionsForCurrentUser } from "./appointmentBooking/access";
import { Permission } from "../shared/permissions";
import { autoResumeConfig, ownsAutoResumeTimer } from "./autoResumeTimerState";

export const get = query({
  args: { conversationId: v.id("conversations") },
  returns: v.union(
    v.null(),
    v.object({ startedAt: v.number(), dueAt: v.number() }),
  ),
  handler: async (ctx, { conversationId }) => {
    const { orgId, userId } = await getAuthContext(ctx);
    const conversation = await ctx.db.get(conversationId);
    if (!conversation) return null;
    const isPersonal = !orgId || orgId === "personal";
    const conversationIsPersonal =
      !conversation.orgId || conversation.orgId === "personal";
    if (
      isPersonal
        ? !conversationIsPersonal || conversation.userId !== userId
        : conversation.orgId !== orgId
    )
      return null;
    const permissions = await permissionsForCurrentUser(ctx);
    if (!permissions.includes(Permission.CHATS_READ))
      throw new Error("Forbidden");
    if (!conversation.escalation || conversation.assignToAiAgent) return null;
    const timer = await ctx.db
      .query("autoDeescalationTimers")
      .withIndex("by_conversationId", (q) =>
        q.eq("conversationId", conversationId),
      )
      .unique();
    if (
      !timer ||
      timer.scope === "normal" ||
      !ownsAutoResumeTimer(timer, conversation)
    )
      return null;
    const config = autoResumeConfig(
      await ctx.db.get(timer.agentId),
      timer.scope,
    );
    if (!config?.enabled || config.activationRevision !== timer.configRevision)
      return null;
    return { startedAt: timer.lastHumanReplyAt, dueAt: timer.dueAt };
  },
});
