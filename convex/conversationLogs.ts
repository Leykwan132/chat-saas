import { v } from "convex/values";
import { Workpool } from "@convex-dev/workpool";
import { internalAction, internalMutation, query, type MutationCtx } from "./_generated/server";
import { type Id } from "./_generated/dataModel";
import { getUserByWorkosId } from "./teamHelpers";
import { getAuthContext } from "./authUtils";
import { components, internal } from "./_generated/api";
import { recordHumanEscalationFact } from "./agentOverviewAggregates";

// Initialize the Workpool for asynchronous logging
export const conversationLogPool = new Workpool(components.conversationLogWorkpool, {
  maxParallelism: 5,
});

export async function logConversationEvent(
  ctx: MutationCtx,
  args: {
    conversationId: Id<"conversations">;
    action:
      | "thread_created"
      | "broadcast_sent"
      | "followup_sent"
      | "ai_enabled"
      | "ai_disabled"
      | "assignee_changed"
      | "escalation_raised"
      | "escalation_resolved"
      | "tag_added"
      | "tag_removed"
      | "event_booked"
      | "event_updated"
      | "event_cancelled"
      | "event_deleted"
      | "lead_status_changed"
      | "user_details_changed";
    actor?: {
      type: "user" | "ai" | "system";
      name?: string;
      userId?: string;
      agentId?: Id<"agents">;
    };
    metadata?: unknown;
  }
) {
  let actorType: "user" | "ai" | "system" = args.actor?.type ?? "system";
  let actorName = args.actor?.name;
  let actorUserId = args.actor?.userId;
  const actorAgentId = args.actor?.agentId;

  if (!args.actor) {
    try {
      const identity = await ctx.auth.getUserIdentity();
      if (identity) {
        actorType = "user";
        actorUserId = identity.subject;
        actorName = identity.name ?? identity.email ?? "User";
        
        // Try to look up custom user db display name if possible
        const user = await getUserByWorkosId(ctx, identity.subject);
        if (user) {
          const nameParts = [user.firstName, user.lastName].filter(Boolean);
          if (nameParts.length > 0) {
            actorName = nameParts.join(" ");
          } else {
            actorName = user.email;
          }
        }
      }
    } catch (error) {
      console.warn("Unable to resolve conversation log actor identity", error);
    }
  }

  await conversationLogPool.enqueueAction(
    ctx,
    internal.conversationLogs.internalLogEventAction,
    {
      conversationId: args.conversationId,
      action: args.action,
      actor: {
        type: actorType,
        name: actorName,
        userId: actorUserId,
        agentId: actorAgentId,
      },
      metadata: args.metadata,
    }
  );
}

export const internalLogEventAction = internalAction({
  args: {
    conversationId: v.id("conversations"),
    action: v.union(
      v.literal("thread_created"),
      v.literal("broadcast_sent"),
      v.literal("followup_sent"),
      v.literal("ai_enabled"),
      v.literal("ai_disabled"),
      v.literal("assignee_changed"),
      v.literal("escalation_raised"),
      v.literal("escalation_resolved"),
      v.literal("tag_added"),
      v.literal("tag_removed"),
      v.literal("event_booked"),
      v.literal("event_updated"),
      v.literal("event_cancelled"),
      v.literal("event_deleted"),
      v.literal("lead_status_changed"),
      v.literal("user_details_changed"),
    ),
    actor: v.object({
      type: v.union(v.literal("user"), v.literal("ai"), v.literal("system")),
      name: v.optional(v.string()),
      userId: v.optional(v.string()),
      agentId: v.optional(v.id("agents")),
    }),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    await ctx.runMutation(internal.conversationLogs.logEvent, {
      conversationId: args.conversationId,
      action: args.action,
      actor: args.actor,
      metadata: args.metadata,
    });
  },
});

export const logEvent = internalMutation({
  args: {
    conversationId: v.id("conversations"),
    action: v.union(
      v.literal("thread_created"),
      v.literal("broadcast_sent"),
      v.literal("followup_sent"),
      v.literal("ai_enabled"),
      v.literal("ai_disabled"),
      v.literal("assignee_changed"),
      v.literal("escalation_raised"),
      v.literal("escalation_resolved"),
      v.literal("tag_added"),
      v.literal("tag_removed"),
      v.literal("event_booked"),
      v.literal("event_updated"),
      v.literal("event_cancelled"),
      v.literal("event_deleted"),
      v.literal("lead_status_changed"),
      v.literal("user_details_changed"),
    ),
    actor: v.object({
      type: v.union(v.literal("user"), v.literal("ai"), v.literal("system")),
      name: v.optional(v.string()),
      userId: v.optional(v.string()),
      agentId: v.optional(v.id("agents")),
    }),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) {
      console.error(`Conversation ${args.conversationId} not found, skipping log.`);
      return;
    }

    const now = Date.now();
    const conversationLogId = await ctx.db.insert("conversationLogs", {
      conversationId: args.conversationId,
      orgId: conversation.orgId,
      action: args.action,
      actorType: args.actor.type,
      actorName: args.actor.name,
      actorUserId: args.actor.userId,
      actorAgentId: args.actor.agentId,
      metadata: args.metadata,
      performedAt: now,
    });
    if (args.action === "escalation_raised" && args.actor.agentId !== undefined) {
      await recordHumanEscalationFact(ctx, {
        conversation,
        agentId: args.actor.agentId,
        conversationLogId,
        timestamp: now,
      });
    }
  }
});

export const listByConversation = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const { orgId } = await getAuthContext(ctx);
    const conv = await ctx.db.get(args.conversationId);
    if (conv === null || conv.orgId !== orgId) {
      return [];
    }

    const logs = await ctx.db
      .query("conversationLogs")
      .withIndex("by_conversationId_and_performedAt", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .order("desc")
      .take(100);

    return logs;
  },
});
