import { v } from "convex/values";
import { mutation, internalMutation, query, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { getAuthContext, resolveChannelOrgId } from "./authUtils";

export const createLocalTemplate = mutation({
  args: {
    channelId: v.id("channels"),
    name: v.string(),
    language: v.string(),
    purpose: v.union(v.literal("broadcasting"), v.literal("follow_up")),
    components: v.any(), // Array of components
  },
  handler: async (ctx, args) => {
    const { orgId, userId } = await getAuthContext(ctx);
    const resolvedOrgId = resolveChannelOrgId(orgId, userId);
    
    // Security check: verify channel belongs to the resolvedOrgId
    const channel = await ctx.db.get(args.channelId);
    if (channel === null || channel.orgId !== resolvedOrgId) {
      throw new Error("Channel not found");
    }

    // Abstract the purpose: broadcasting -> MARKETING, follow_up -> UTILITY
    const category = args.purpose === "broadcasting" ? "MARKETING" : "UTILITY";
    
    const templateId = await ctx.db.insert("whatsappTemplates", {
      orgId: resolvedOrgId,
      channelId: args.channelId,
      name: args.name,
      language: args.language,
      purpose: args.purpose,
      category,
      components: args.components,
      status: "submitting",
      createdAt: Date.now(),
    });
    
    // Schedule background submission
    await ctx.scheduler.runAfter(0, internal.whatsappTemplatesAction.submitTemplateToMeta, {
      templateId,
    });
    
    return { success: true, templateId };
  },
});

export const updateTemplateStatus = internalMutation({
  args: {
    templateId: v.id("whatsappTemplates"),
    status: v.union(v.literal("submitted"), v.literal("failed")),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.templateId, {
      status: args.status,
      error: args.error,
    });
  },
});

export const deleteLocalTemplate = internalMutation({
  args: {
    templateId: v.id("whatsappTemplates"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.templateId);
  },
});

export const listLocalTemplates = query({
  args: {
    channelId: v.id("channels"),
  },
  handler: async (ctx, args) => {
    const { orgId, userId } = await getAuthContext(ctx);
    const resolvedOrgId = resolveChannelOrgId(orgId, userId);
    return await ctx.db
      .query("whatsappTemplates")
      .withIndex("by_orgId_and_channelId", (q) =>
        q.eq("orgId", resolvedOrgId).eq("channelId", args.channelId)
      )
      .collect();
  },
});

// Internal queries for background actions
export const internalGetTemplate = internalQuery({
  args: { templateId: v.id("whatsappTemplates") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.templateId);
  },
});

export const internalGetChannel = internalQuery({
  args: { channelId: v.id("channels") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.channelId);
  },
});
