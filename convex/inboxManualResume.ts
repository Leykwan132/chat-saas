import { v } from "convex/values";
import { mutation, internalMutation } from "./triggers";
import { internal } from "./_generated/api";
import { getAuthContext } from "./authUtils";
import { permissionsForCurrentUser } from "./appointmentBooking/access";
import { Permission } from "../shared/permissions";
import { isConversationInAiReplyAudience } from "./leadRouting/audience";
import type { Doc } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";

async function resume(ctx: MutationCtx, conversation: Doc<"conversations">) {
  await ctx.db.patch(conversation._id, {
    assignToAiAgent: true,
    manualAiResumeAt: undefined,
    manualAiResumeStartedAt: undefined,
    ...(conversation.escalation
      ? { escalation: undefined, status: "open" as const }
      : {}),
    updatedAt: Date.now(),
  });
  await ctx.runMutation(internal.conversationLogs.logEvent, {
    conversationId: conversation._id,
    action: "ai_enabled",
    actor: { type: "system", name: "Scheduled AI resume" },
  });
  if (conversation.escalation)
    await ctx.runMutation(internal.conversationLogs.logEvent, {
      conversationId: conversation._id,
      action: "escalation_resolved",
      actor: { type: "system", name: "Scheduled AI resume" },
    });
}

export const set = mutation({
  args: { conversationId: v.id("conversations"), minutes: v.number() },
  returns: v.null(),
  handler: async (ctx, { conversationId, minutes }) => {
    if (!Number.isInteger(minutes) || minutes < 0 || minutes > 10080)
      throw new Error(
        "Choose a whole number from 1 to 10080 minutes, or resume now.",
      );
    const auth = await getAuthContext(ctx);
    const conversation = await ctx.db.get(conversationId);
    const personal = !auth.orgId || auth.orgId === "personal";
    if (
      !conversation ||
      (personal
        ? (!!conversation.orgId && conversation.orgId !== "personal") ||
          conversation.userId !== auth.userId
        : conversation.orgId !== auth.orgId)
    )
      throw new Error("Conversation not found");
    if (
      !(await permissionsForCurrentUser(ctx)).includes(Permission.CHATS_ASSIGN)
    )
      throw new Error("Forbidden");
    if (
      conversation.status === "closed" ||
      !conversation.assignedAgentId ||
      !(await isConversationInAiReplyAudience(ctx, conversation))
    )
      throw new Error("AI replies are unavailable for this conversation.");
    if (minutes === 0) {
      await resume(ctx, conversation);
      return null;
    }
    const startedAt = Date.now();
    const dueAt = startedAt + minutes * 60000;
    const revision = (conversation.manualAiResumeRevision ?? 0) + 1;
    await ctx.db.patch(conversationId, {
      assignToAiAgent: false,
      manualAiResumeAt: dueAt,
      manualAiResumeStartedAt: startedAt,
      manualAiResumeRevision: revision,
      updatedAt: Date.now(),
    });
    const timer = await ctx.db
      .query("autoDeescalationTimers")
      .withIndex("by_conversationId", (q) =>
        q.eq("conversationId", conversationId),
      )
      .unique();
    if (timer) {
      if (timer.scheduledJobId) {
        const job = await ctx.db.system.get(timer.scheduledJobId);
        if (job?.state.kind === "pending")
          await ctx.scheduler.cancel(timer.scheduledJobId);
      }
      await ctx.db.delete(timer._id);
    }
    await ctx.scheduler.runAt(dueAt, internal.inboxManualResume.expire, {
      conversationId,
      revision,
      dueAt,
      agentId: conversation.assignedAgentId,
      assignedUserId: conversation.assignedUserId,
      escalatedAt: conversation.escalation?.escalatedAt,
    });
    return null;
  },
});

export const expire = internalMutation({
  args: {
    conversationId: v.id("conversations"),
    revision: v.number(),
    dueAt: v.number(),
    agentId: v.id("agents"),
    assignedUserId: v.optional(v.string()),
    escalatedAt: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId);
    if (
      !conversation ||
      conversation.manualAiResumeRevision !== args.revision ||
      conversation.manualAiResumeAt !== args.dueAt
    )
      return null;
    if (
      conversation.status === "closed" ||
      conversation.assignToAiAgent ||
      conversation.assignedAgentId !== args.agentId ||
      conversation.assignedUserId !== args.assignedUserId ||
      conversation.escalation?.escalatedAt !== args.escalatedAt ||
      !(await isConversationInAiReplyAudience(ctx, conversation))
    ) {
      await ctx.db.patch(conversation._id, {
        manualAiResumeAt: undefined,
        manualAiResumeStartedAt: undefined,
      });
      return null;
    }
    if (Date.now() >= args.dueAt) await resume(ctx, conversation);
    return null;
  },
});
