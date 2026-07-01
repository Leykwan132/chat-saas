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
    parameterFormat: v.optional(v.union(v.literal("named"))),
    components: v.any(), // Array of components
  },
  handler: async (ctx, args) => {
    const { orgId, userId } = await getAuthContext(ctx);
    const resolvedOrgId = resolveChannelOrgId(orgId, userId);
    
    const channel = await ctx.db.get(args.channelId);
    if (channel === null || channel.orgId !== resolvedOrgId) {
      throw new Error("Channel not found");
    }

    const category: "MARKETING" | "UTILITY" =
      args.purpose === "broadcasting" ? "MARKETING" : "UTILITY";
    
    const templateData = {
      orgId: resolvedOrgId,
      channelId: args.channelId,
      name: args.name,
      language: args.language,
      purpose: args.purpose,
      category,
      components: args.components,
      status: "submitting" as const,
      createdAt: Date.now(),
      ...(args.parameterFormat !== undefined
        ? { parameterFormat: args.parameterFormat }
        : {}),
    };

    const templateId = await ctx.db.insert("whatsappTemplates", templateData);

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
      ...(args.error !== undefined ? { error: args.error } : {}),
    });
  },
});

export const upsertLocalTemplateComponents = internalMutation({
  args: {
    orgId: v.string(),
    channelId: v.id("channels"),
    name: v.string(),
    language: v.string(),
    category: v.union(v.literal("MARKETING"), v.literal("UTILITY")),
    components: v.any(),
    parameterFormat: v.optional(v.union(v.literal("named"))),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("whatsappTemplates")
      .withIndex("by_channelId_and_name_and_language", (q) =>
        q
          .eq("channelId", args.channelId)
          .eq("name", args.name.trim())
          .eq("language", args.language.trim()),
      )
      .unique();

    const common = {
      category: args.category,
      components: args.components,
      status: "submitted" as const,
      ...(args.parameterFormat !== undefined
        ? { parameterFormat: args.parameterFormat }
        : {}),
    };

    if (existing !== null) {
      await ctx.db.patch(existing._id, common);
      return { templateId: existing._id };
    }

    const templateId = await ctx.db.insert("whatsappTemplates", {
      orgId: args.orgId,
      channelId: args.channelId,
      name: args.name.trim(),
      language: args.language.trim(),
      purpose: args.category === "MARKETING" ? "broadcasting" : "follow_up",
      createdAt: Date.now(),
      ...common,
    });

    return { templateId };
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

export const internalGetTemplateByChannelAndName = internalQuery({
  args: {
    channelId: v.id("channels"),
    name: v.string(),
    language: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("whatsappTemplates")
      .withIndex("by_channelId_and_name_and_language", (q) =>
        q
          .eq("channelId", args.channelId)
          .eq("name", args.name.trim())
          .eq("language", args.language.trim()),
      )
      .unique();
  },
});
