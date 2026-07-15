import { v } from "convex/values";
import { mutation, internalMutation } from "./_generated/server";
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
    
    const now = Date.now();
    const templateData = {
      orgId: resolvedOrgId,
      channelId: args.channelId,
      name: args.name,
      language: args.language,
      purpose: args.purpose,
      category,
      components: args.components,
      status: "submitting" as const,
      statusUpdatedAt: now,
      createdAt: now,
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

export const completeTemplateSubmission = internalMutation({
  args: {
    templateId: v.id("whatsappTemplates"),
    metaTemplateId: v.string(),
  },
  handler: async (ctx, args) => {
    const template = await ctx.db.get(args.templateId);
    if (template === null) throw new Error("Template not found");
    const metaTemplateId = args.metaTemplateId.trim();
    if (!metaTemplateId) {
      throw new Error("Meta template creation returned no template ID.");
    }
    if (template.status !== "submitting") {
      await ctx.db.patch(args.templateId, { metaTemplateId });
      return;
    }
    await ctx.db.patch(args.templateId, {
      metaTemplateId,
      status: "in_review",
      error: undefined,
      statusUpdatedAt: Date.now(),
    });
  },
});

export const beginTemplateUpdate = internalMutation({
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
    const template = await ctx.db
      .query("whatsappTemplates")
      .withIndex("by_channelId_and_name_and_language", (q) =>
        q
          .eq("channelId", args.channelId)
          .eq("name", args.name.trim())
          .eq("language", args.language.trim()),
      )
      .unique();
    if (template === null || template.orgId !== args.orgId) {
      throw new Error("Template not found");
    }
    const metaTemplateId = template.metaTemplateId?.trim();
    if (!metaTemplateId) throw new Error("Template has no Meta template ID.");
    await ctx.db.patch(template._id, {
      category: args.category,
      components: args.components,
      parameterFormat: args.parameterFormat,
      status: "submitting",
      error: undefined,
      statusUpdatedAt: Date.now(),
    });
    return { templateId: template._id, metaTemplateId };
  },
});

export const failTemplateSubmission = internalMutation({
  args: {
    templateId: v.id("whatsappTemplates"),
    error: v.string(),
  },
  handler: async (ctx, args) => {
    const template = await ctx.db.get(args.templateId);
    if (template === null) throw new Error("Template not found");
    if (template.status === "approved") return;
    await ctx.db.patch(args.templateId, {
      status: "failed",
      error: args.error,
      statusUpdatedAt: Date.now(),
    });
  },
});
