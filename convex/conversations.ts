import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { action, internalQuery, mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { api, internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { getAuthContext } from "./authUtils";
import { metaIndicatorPool } from "./inboxPools";
import { logConversationEvent } from "./conversationLogs";

export async function getLinkedInboxConversationDocs(ctx: QueryCtx, orgId: string) {
  const channelRows = await ctx.db
    .query("channels")
    .withIndex("by_orgId_and_service", (q) => q.eq("orgId", orgId))
    .collect();

  const connectedChannelById = new Map(
    channelRows
      .filter((c) => c.status === "connected")
      .map((c) => [c._id, c] as const),
  );

  if (connectedChannelById.size === 0) {
    return {
      connectedChannelById,
      conversations: [] as Doc<"conversations">[],
    };
  }

  const recent = await ctx.db
    .query("conversations")
    .withIndex("by_orgId_and_lastMessageAt", (q) => q.eq("orgId", orgId))
    .order("desc")
    .take(400);

  const conversations = recent.filter(
    (c) =>
      c.service !== "playground" &&
      c.channelId !== undefined &&
      connectedChannelById.has(c.channelId),
  );

  return { connectedChannelById, conversations };
}

function conversationBelongsToAgent(
  conv: Doc<"conversations">,
  connectedChannelById: Map<Id<"channels">, Doc<"channels">>,
  agentId: Id<"agents">,
): boolean {
  if (conv.assignedAgentId === agentId) {
    return true;
  }
  if (conv.channelId === undefined) {
    return false;
  }
  const channel = connectedChannelById.get(conv.channelId);
  return channel?.defaultAgentId === agentId;
}

// Latest inbox threads tied to channels that are still connected. Omits the AI
// playground and orphaned rows left after disconnect (channel no longer linked).
export const listLinkedForCurrentOrg = query({
  args: {},
  handler: async (ctx) => {
    const { orgId } = await getAuthContext(ctx);
    if (orgId === "personal" || !orgId) {
      return [];
    }

    const { conversations } = await getLinkedInboxConversationDocs(ctx, orgId);
    if (conversations.length === 0) {
      return [];
    }

    const out = [];
    for (const c of conversations) {
      let tags: string[] = [];
      let leadTemperature: "Hot" | "Warm" | "Cold" | undefined = undefined;
      if (c.customerId !== undefined) {
        const cust = await ctx.db.get(c.customerId);
        if (cust !== null) {
          tags = cust.tags ?? [];
          leadTemperature = cust.leadTemperature;
        }
      }
      out.push({
        ...c,
        tags,
        leadTemperature,
      });
    }
    return out;
  },
});

export const getTotalUnreadForAgent = query({
  args: {
    agentId: v.id("agents"),
  },
  handler: async (ctx, args) => {
    const { orgId } = await getAuthContext(ctx);
    if (orgId === "personal" || !orgId) {
      return 0;
    }

    const agent = await ctx.db.get(args.agentId);
    if (agent === null || agent.orgId !== orgId) {
      return 0;
    }

    const { connectedChannelById, conversations } =
      await getLinkedInboxConversationDocs(ctx, orgId);

    let totalUnread = 0;
    for (const conv of conversations) {
      if (!conversationBelongsToAgent(conv, connectedChannelById, args.agentId)) {
        continue;
      }
      totalUnread += conv.unreadCount;
    }
    return totalUnread;
  },
});

// Inbox list for the caller's org. Excludes "playground" service rows so the
// AI-playground threads don't show up in the customer-conversations inbox.
export const listForCurrentOrg = query({
  args: {
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const { orgId } = await getAuthContext(ctx);
    if (orgId === "personal" || !orgId) {
      return { page: [], isDone: true, continueCursor: "" };
    }
    const result = await ctx.db
      .query("conversations")
      .withIndex("by_orgId_and_lastMessageAt", (q) => q.eq("orgId", orgId))
      .order("desc")
      .paginate(args.paginationOpts);
    return {
      ...result,
      page: result.page.filter((c) => c.service !== "playground"),
    };
  },
});

// Single conversation read by id, with org ownership check.
export const get = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const { orgId } = await getAuthContext(ctx);
    const conv = await ctx.db.get(args.conversationId);
    if (conv === null || conv.orgId !== orgId) return null;
    let tags: string[] = [];
    let leadTemperature: "Hot" | "Warm" | "Cold" | undefined = undefined;
    if (conv.customerId !== undefined) {
      const cust = await ctx.db.get(conv.customerId);
      if (cust !== null) {
        tags = cust.tags ?? [];
        leadTemperature = cust.leadTemperature;
      }
    }
    return {
      ...conv,
      tags,
      leadTemperature,
    };
  },
});

type MarkReadResult = {
  markedRead: boolean;
  service: Doc<"conversations">["service"];
  latestInboundExternalId?: string;
};

async function latestIncomingExternalId(
  ctx: MutationCtx,
  conversationId: Id<"conversations">,
): Promise<string | undefined> {
  const recent = await ctx.db
    .query("messages")
    .withIndex("by_conversationId_and_createdAt", (q) =>
      q.eq("conversationId", conversationId),
    )
    .order("desc")
    .take(50);
  return recent.find((m) => m.direction === "incoming" && m.externalId)
    ?.externalId;
}

function markReadResult(
  markedRead: boolean,
  service: Doc<"conversations">["service"],
  latestInboundExternalId?: string,
): MarkReadResult {
  return latestInboundExternalId
    ? { markedRead, service, latestInboundExternalId }
    : { markedRead, service };
}

export const markRead = mutation({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args): Promise<MarkReadResult> => {
    const { orgId } = await getAuthContext(ctx);
    const conv = await ctx.db.get(args.conversationId);
    if (conv === null || conv.orgId !== orgId) {
      throw new Error("Conversation not found");
    }
    if (conv.unreadCount === 0) {
      return markReadResult(false, conv.service);
    }
    await ctx.db.patch(args.conversationId, {
      unreadCount: 0,
      updatedAt: Date.now(),
    });
    return markReadResult(
      true,
      conv.service,
      await latestIncomingExternalId(ctx, args.conversationId),
    );
  },
});

export const markReadAndSendSeen = action({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args): Promise<void> => {
    const result: MarkReadResult = await ctx.runMutation(
      api.conversations.markRead,
      { conversationId: args.conversationId },
    );
    if (!result.markedRead || result.service === "playground") {
      return;
    }
    if (result.service === "whatsapp" && !result.latestInboundExternalId) {
      return;
    }
    await metaIndicatorPool.enqueueAction(
      ctx,
      internal.chat.inboxActions.internalSendMetaMarkSeen,
      {
        conversationId: args.conversationId,
        messageExternalId: result.latestInboundExternalId,
      },
    );
  },
});

export const ensureAssignedAgent = mutation({
  args: {
    conversationId: v.id("conversations"),
    agentId: v.id("agents"),
  },
  handler: async (ctx, args) => {
    const { orgId } = await getAuthContext(ctx);
    const conv = await ctx.db.get(args.conversationId);
    if (conv === null || conv.orgId !== orgId) {
      throw new Error("Conversation not found");
    }
    const agent = await ctx.db.get(args.agentId);
    if (agent === null || agent.orgId !== orgId) {
      throw new Error("Agent not found");
    }
    if (conv.assignedAgentId === args.agentId) return;
    await ctx.db.patch(args.conversationId, {
      assignedAgentId: args.agentId,
      updatedAt: Date.now(),
    });
  },
});

// Legacy shim — prefer setConversationAiEnabled / setConversationLeadOwner.
export const setAssignee = mutation({
  args: {
    conversationId: v.id("conversations"),
    assignee: v.union(
      v.object({ kind: v.literal("ai") }),
      v.object({ kind: v.literal("user"), workosUserId: v.string() }),
    ),
  },
  handler: async (ctx, args) => {
    if (args.assignee.kind === "ai") {
      await setConversationAiEnabledHandler(ctx, args.conversationId, true);
      return;
    }
    await setConversationLeadOwnerHandler(ctx, args.conversationId, args.assignee.workosUserId);
  },
});

export const setConversationAiEnabled = mutation({
  args: {
    conversationId: v.id("conversations"),
    enabled: v.boolean(),
  },
  handler: async (ctx, args) => {
    await setConversationAiEnabledHandler(ctx, args.conversationId, args.enabled);
  },
});

export const setConversationLeadOwner = mutation({
  args: {
    conversationId: v.id("conversations"),
    workosUserId: v.string(),
  },
  handler: async (ctx, args) => {
    await setConversationLeadOwnerHandler(ctx, args.conversationId, args.workosUserId);
  },
});

async function setConversationAiEnabledHandler(
  ctx: MutationCtx,
  conversationId: Id<"conversations">,
  enabled: boolean,
) {
  const { orgId } = await getAuthContext(ctx);
  const conv = await ctx.db.get(conversationId);
  if (conv === null || conv.orgId !== orgId) {
    throw new Error("Conversation not found");
  }
  const patch: Record<string, any> = {
    assignToAiAgent: enabled,
    updatedAt: Date.now(),
  };
  if (enabled && conv.status === "requires_user_input") {
    patch.status = "open";
    patch.escalation = undefined;
  }
  await ctx.db.patch(conversationId, patch);
  await logConversationEvent(ctx, {
    conversationId,
    action: enabled ? "ai_enabled" : "ai_disabled",
  });
}

async function setConversationLeadOwnerHandler(
  ctx: MutationCtx,
  conversationId: Id<"conversations">,
  workosUserId: string,
) {
  const { orgId } = await getAuthContext(ctx);
  const conv = await ctx.db.get(conversationId);
  if (conv === null || conv.orgId !== orgId) {
    throw new Error("Conversation not found");
  }

  const org = await ctx.db
    .query("organizations")
    .withIndex("by_workosOrgId", (q) => q.eq("workosOrgId", orgId))
    .unique();
  if (org === null) {
    throw new Error("Organization not found");
  }

  const userRow = await ctx.db
    .query("users")
    .withIndex("by_workosUserId", (q) => q.eq("workosUserId", workosUserId))
    .unique();
  if (userRow === null || !org.members.includes(userRow._id)) {
    throw new Error("User is not a member of this organization");
  }

  await ctx.db.patch(conversationId, {
    assignedUserId: workosUserId,
    updatedAt: Date.now(),
  });
  const nameParts = [userRow.firstName, userRow.lastName].filter(Boolean);
  const assigneeName = nameParts.length > 0 ? nameParts.join(" ") : userRow.email;

  await logConversationEvent(ctx, {
    conversationId,
    action: "assignee_changed",
    metadata: {
      assigneeUserId: workosUserId,
      assigneeName,
    },
  });
}

export const internalResolveAgentId = internalQuery({
  args: {
    orgId: v.string(),
    preferredAgentId: v.optional(v.id("agents")),
  },
  handler: async (ctx, args): Promise<Id<"agents"> | undefined> => {
    if (args.preferredAgentId) {
      const agent = await ctx.db.get(args.preferredAgentId);
      if (agent !== null && agent.orgId === args.orgId) {
        return args.preferredAgentId;
      }
    }
    const agents = await ctx.db
      .query("agents")
      .withIndex("by_orgId", (q) => q.eq("orgId", args.orgId))
      .collect();
    if (agents.length === 1) return agents[0]!._id;
    return undefined;
  },
});

const MAX_TAGS_PER_CONVERSATION = 24;
const MAX_TAG_LENGTH = 48;

export const addConversationTag = mutation({
  args: {
    conversationId: v.id("conversations"),
    tag: v.string(),
  },
  handler: async (ctx, args) => {
    const { orgId } = await getAuthContext(ctx);
    const conv = await ctx.db.get(args.conversationId);
    if (conv === null || conv.orgId !== orgId) {
      throw new Error("Conversation not found");
    }
    const normalized = args.tag.trim().slice(0, MAX_TAG_LENGTH);
    if (normalized.length === 0) {
      throw new Error("Tag cannot be empty");
    }
    const current = conv.tags ?? [];
    if (current.includes(normalized)) {
      return;
    }
    if (current.length >= MAX_TAGS_PER_CONVERSATION) {
      throw new Error("Too many tags on this conversation");
    }
    await ctx.db.patch(args.conversationId, {
      tags: [...current, normalized],
      updatedAt: Date.now(),
    });
    await logConversationEvent(ctx, {
      conversationId: args.conversationId,
      action: "tag_added",
      metadata: { tag: normalized },
    });
  },
});

export const removeConversationTag = mutation({
  args: {
    conversationId: v.id("conversations"),
    tag: v.string(),
  },
  handler: async (ctx, args) => {
    const { orgId } = await getAuthContext(ctx);
    const conv = await ctx.db.get(args.conversationId);
    if (conv === null || conv.orgId !== orgId) {
      throw new Error("Conversation not found");
    }
    const current = conv.tags ?? [];
    await ctx.db.patch(args.conversationId, {
      tags: current.filter((t) => t !== args.tag),
      updatedAt: Date.now(),
    });
    await logConversationEvent(ctx, {
      conversationId: args.conversationId,
      action: "tag_removed",
      metadata: { tag: args.tag },
    });
  },
});

export const resolveEscalation = mutation({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    const { orgId } = await getAuthContext(ctx);
    const conv = await ctx.db.get(args.conversationId);
    if (conv === null || conv.orgId !== orgId) {
      throw new Error("Conversation not found");
    }

    if (conv.status !== "requires_user_input" && !conv.escalation) {
      return;
    }

    await ctx.db.patch(args.conversationId, {
      status: "open",
      escalation: undefined,
      updatedAt: Date.now(),
    });
    await logConversationEvent(ctx, {
      conversationId: args.conversationId,
      action: "escalation_resolved",
    });
  },
});
