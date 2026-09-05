import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { getAuthContext, resolveChannelOrgId } from "./authUtils";
import { getOwnedAgentForAuth } from "./agentAccess";
import { normalizeCommentAutomationInput } from "./commentAutomationInput";
import { getPlanFromStripe } from "./plans";
import type { Id } from "./_generated/dataModel";

const allowedEmail = "leykwan132@gmail.com";
const triggerValidator = v.union(v.literal("any_comment"), v.literal("keywords"));

async function getCommentAutomationAuth(ctx: QueryCtx | MutationCtx) {
  const auth = await getAuthContext(ctx);
  if (auth.email !== allowedEmail) throw new Error("Comment-to-Inbox is unavailable");
  return { ...auth, channelOrgId: resolveChannelOrgId(auth.orgId, auth.userId) };
}

async function validateChannelIds(
  ctx: QueryCtx | MutationCtx,
  channelIds: Id<"channels">[],
  orgId: string,
  agentId: Id<"agents">,
) {
  if (channelIds.length === 0) throw new Error("Select at least one page");
  const uniqueChannelIds = [...new Set(channelIds)];
  if (uniqueChannelIds.length !== channelIds.length) throw new Error("Select each page once");
  for (const channelId of uniqueChannelIds) {
    const channel = await ctx.db.get(channelId);
    if (
      channel === null ||
      channel.orgId !== orgId ||
      channel.defaultAgentId !== agentId ||
      channel.status !== "connected" ||
      (channel.service !== "instagram" && channel.service !== "messenger")
    ) {
      throw new Error("Selected page is unavailable");
    }
  }
  return uniqueChannelIds;
}

export const list = query({
  args: {},
  handler: async (ctx) => {
    const { channelOrgId } = await getCommentAutomationAuth(ctx);
    return await ctx.db
      .query("commentAutomations")
      .withIndex("by_orgId", (q) => q.eq("orgId", channelOrgId))
      .order("desc")
      .take(100);
  },
});

export const listPages = query({
  args: { agentId: v.id("agents") },
  handler: async (ctx, args) => {
    const auth = await getCommentAutomationAuth(ctx);
    const agent = await getOwnedAgentForAuth(ctx, auth, args.agentId);
    if (agent === null) throw new Error("Agent not found");
    const [instagramPages, messengerPages] = await Promise.all([
      ctx.db.query("channels").withIndex("by_defaultAgentId_and_service", (q) => (
        q.eq("defaultAgentId", args.agentId).eq("service", "instagram")
      )).take(100),
      ctx.db.query("channels").withIndex("by_defaultAgentId_and_service", (q) => (
        q.eq("defaultAgentId", args.agentId).eq("service", "messenger")
      )).take(100),
    ]);
    return [...instagramPages, ...messengerPages].filter(
      (channel) => channel.orgId === auth.channelOrgId && channel.status === "connected",
    );
  },
});

export const get = query({
  args: { automationId: v.id("commentAutomations"), paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    const { channelOrgId } = await getCommentAutomationAuth(ctx);
    const automation = await ctx.db.get(args.automationId);
    if (automation === null || automation.orgId !== channelOrgId) throw new Error("Automation not found");
    const pages = await ctx.db
      .query("commentAutomationPages")
      .withIndex("by_automationId", (q) => q.eq("automationId", automation._id))
      .take(100);
    const deliveries = await ctx.db
      .query("commentAutomationDeliveries")
      .withIndex("by_automationId_and_createdAt", (q) => q.eq("automationId", automation._id))
      .order("desc")
      .paginate(args.paginationOpts);
    return { automation, pages, deliveries };
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    trigger: triggerValidator,
    keywords: v.array(v.string()),
    privateMessage: v.string(),
    publicReply: v.optional(v.string()),
    channelIds: v.array(v.id("channels")),
    agentId: v.id("agents"),
  },
  handler: async (ctx, args) => {
    const auth = await getCommentAutomationAuth(ctx);
    const { userId, channelOrgId } = auth;
    const existing = await ctx.db
      .query("commentAutomations")
      .withIndex("by_orgId", (q) => q.eq("orgId", channelOrgId))
      .take(2);
    const plan = await getPlanFromStripe(ctx, userId);
    if (plan.plan === "free" && existing.length >= 1) {
      throw new Error("Free workspaces can create one Comment automation");
    }
    const agent = await getOwnedAgentForAuth(ctx, auth, args.agentId);
    if (agent === null) throw new Error("Agent not found");
    const channelIds = await validateChannelIds(ctx, args.channelIds, channelOrgId, args.agentId);
    const input = normalizeCommentAutomationInput(args);
    const now = Date.now();
    const automationId = await ctx.db.insert("commentAutomations", {
      orgId: channelOrgId,
      ...input,
      status: "inactive",
      sentCount: 0,
      respondedCount: 0,
      createdByUserId: userId,
      createdAt: now,
      updatedAt: now,
    });
    for (const channelId of channelIds) {
      await ctx.db.insert("commentAutomationPages", {
        automationId,
        channelId,
        subscriptionStatus: "pending",
        updatedAt: now,
      });
    }
    return automationId;
  },
});

export const update = mutation({
  args: {
    automationId: v.id("commentAutomations"),
    name: v.string(),
    trigger: triggerValidator,
    keywords: v.array(v.string()),
    privateMessage: v.string(),
    publicReply: v.optional(v.string()),
    channelIds: v.array(v.id("channels")),
    agentId: v.id("agents"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const auth = await getCommentAutomationAuth(ctx);
    const { channelOrgId } = auth;
    const automation = await ctx.db.get(args.automationId);
    if (automation === null || automation.orgId !== channelOrgId) throw new Error("Automation not found");
    const agent = await getOwnedAgentForAuth(ctx, auth, args.agentId);
    if (agent === null) throw new Error("Agent not found");
    const channelIds = await validateChannelIds(ctx, args.channelIds, channelOrgId, args.agentId);
    const input = normalizeCommentAutomationInput(args);
    const now = Date.now();
    await ctx.db.patch(automation._id, { ...input, updatedAt: now });

    const pages = await ctx.db
      .query("commentAutomationPages")
      .withIndex("by_automationId", (q) => q.eq("automationId", automation._id))
      .take(100);
    const selectedChannelIds = new Set(channelIds);
    for (const page of pages) {
      if (!selectedChannelIds.has(page.channelId)) await ctx.db.delete(page._id);
    }
    const existingChannelIds = new Set(pages.map((page) => page.channelId));
    for (const channelId of channelIds) {
      if (!existingChannelIds.has(channelId)) {
        await ctx.db.insert("commentAutomationPages", {
          automationId: automation._id,
          channelId,
          subscriptionStatus: "pending",
          updatedAt: now,
        });
      }
    }
    return null;
  },
});

export const setActive = mutation({
  args: { automationId: v.id("commentAutomations"), active: v.boolean() },
  handler: async (ctx, args) => {
    const { channelOrgId } = await getCommentAutomationAuth(ctx);
    const automation = await ctx.db.get(args.automationId);
    if (automation === null || automation.orgId !== channelOrgId) throw new Error("Automation not found");
    if (args.active) {
      const pages = await ctx.db
        .query("commentAutomationPages")
        .withIndex("by_automationId", (q) => q.eq("automationId", automation._id))
        .take(100);
      if (pages.some((page) => page.subscriptionStatus !== "subscribed")) {
        throw new Error("Subscribe selected pages before activating");
      }
    }
    await ctx.db.patch(automation._id, {
      status: args.active ? "active" : "inactive",
      updatedAt: Date.now(),
    });
  },
});
