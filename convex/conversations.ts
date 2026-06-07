import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { internalQuery, mutation, query, type MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { getAuthContext } from "./authUtils";

// Latest inbox threads tied to channels that are still connected. Omits the AI
// playground and orphaned rows left after disconnect (channel no longer linked).
export const listLinkedForCurrentOrg = query({
  args: {},
  handler: async (ctx) => {
    const { orgId } = await getAuthContext(ctx);
    if (orgId === "personal" || !orgId) {
      return [];
    }

    const channelRows = await ctx.db
      .query("channels")
      .withIndex("by_orgId_and_service", (q) => q.eq("orgId", orgId))
      .collect();

    const connectedIds = new Set(
      channelRows
        .filter((c) => c.status === "connected")
        .map((c) => c._id),
    );

    if (connectedIds.size === 0) {
      return [];
    }

    const recent = await ctx.db
      .query("conversations")
      .withIndex("by_orgId_and_lastMessageAt", (q) => q.eq("orgId", orgId))
      .order("desc")
      .take(400);

    const filtered = recent.filter(
      (c) =>
        c.service !== "playground" &&
        c.channelId !== undefined &&
        connectedIds.has(c.channelId),
    );

    const out = [];
    for (const c of filtered) {
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

export const markRead = mutation({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const { orgId } = await getAuthContext(ctx);
    const conv = await ctx.db.get(args.conversationId);
    if (conv === null || conv.orgId !== orgId) {
      throw new Error("Conversation not found");
    }
    if (conv.unreadCount === 0) return;
    await ctx.db.patch(args.conversationId, {
      unreadCount: 0,
      updatedAt: Date.now(),
    });
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
  },
});
