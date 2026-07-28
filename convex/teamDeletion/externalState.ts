import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { internalMutation, internalQuery } from "../_generated/server";

export const prepareWorkspace = internalMutation({
  args: {
    jobId: v.id("teamDeletionJobs"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job) return null;
    const now = Date.now();
    const channels = await ctx.db
      .query("channels")
      .withIndex("by_orgId_and_service", (q) =>
        q.eq("orgId", job.workosOrgId),
      )
      .take(50);
    for (const channel of channels) {
      await ctx.db.patch(channel._id, {
        status: "disconnected",
        updatedAt: now,
      });
    }
    return null;
  },
});

export const clearChannelCredentials = internalMutation({
  args: {
    jobId: v.id("teamDeletionJobs"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job) return null;
    const channels = await ctx.db
      .query("channels")
      .withIndex("by_orgId_and_service", (q) =>
        q.eq("orgId", job.workosOrgId),
      )
      .take(50);
    for (const channel of channels) {
      await ctx.db.patch(channel._id, {
        status: "disconnected",
        accessToken: undefined,
        tokenExpiresAt: undefined,
        updatedAt: Date.now(),
      });
    }
    return null;
  },
});

export const getThreadPage = internalQuery({
  args: {
    jobId: v.id("teamDeletionJobs"),
    paginationOpts: paginationOptsValidator,
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job) return null;
    const page = await ctx.db
      .query("conversations")
      .withIndex("by_orgId_and_lastMessageAt", (q) =>
        q.eq("orgId", job.workosOrgId),
      )
      .paginate(args.paginationOpts);
    const fallbackAgent = await ctx.db
      .query("agents")
      .withIndex("by_orgId", (q) => q.eq("orgId", job.workosOrgId))
      .first();
    return {
      ...page,
      page: page.page.map((conversation) => ({
        threadId: conversation.threadId,
        agentId: conversation.assignedAgentId ?? fallbackAgent?._id,
      })),
    };
  },
});

export const getAgent = internalQuery({
  args: {
    agentId: v.id("agents"),
  },
  returns: v.any(),
  handler: async (ctx, args) => await ctx.db.get(args.agentId),
});

export const getMediaUploadPage = internalQuery({
  args: {
    jobId: v.id("teamDeletionJobs"),
    paginationOpts: paginationOptsValidator,
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job) return null;
    return await ctx.db
      .query("mediaUploads")
      .withIndex("by_orgId", (q) => q.eq("orgId", job.workosOrgId))
      .paginate(args.paginationOpts);
  },
});

export const getQuickReplyPage = internalQuery({
  args: {
    jobId: v.id("teamDeletionJobs"),
    paginationOpts: paginationOptsValidator,
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job) return null;
    return await ctx.db
      .query("quickReplies")
      .withIndex("by_teamId", (q) => q.eq("teamId", job.teamId))
      .paginate(args.paginationOpts);
  },
});

export const getTemplateMediaPage = internalQuery({
  args: {
    jobId: v.id("teamDeletionJobs"),
    paginationOpts: paginationOptsValidator,
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job) return null;
    return await ctx.db
      .query("whatsappTemplateMediaAssets")
      .withIndex("by_orgId", (q) => q.eq("orgId", job.workosOrgId))
      .paginate(args.paginationOpts);
  },
});

const knowledgeTableValidator = v.union(
  v.literal("textEntries"),
  v.literal("fileEntries"),
  v.literal("webEntries"),
  v.literal("qaEntries"),
);

export const getKnowledgePage = internalQuery({
  args: {
    jobId: v.id("teamDeletionJobs"),
    table: knowledgeTableValidator,
    paginationOpts: paginationOptsValidator,
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job) return null;
    if (args.table === "textEntries") {
      return await ctx.db.query("textEntries")
        .withIndex("by_orgId", (q) => q.eq("orgId", job.workosOrgId))
        .paginate(args.paginationOpts);
    }
    if (args.table === "fileEntries") {
      return await ctx.db.query("fileEntries")
        .withIndex("by_orgId", (q) => q.eq("orgId", job.workosOrgId))
        .paginate(args.paginationOpts);
    }
    if (args.table === "webEntries") {
      return await ctx.db.query("webEntries")
        .withIndex("by_orgId", (q) => q.eq("orgId", job.workosOrgId))
        .paginate(args.paginationOpts);
    }
    return await ctx.db.query("qaEntries")
      .withIndex("by_orgId", (q) => q.eq("orgId", job.workosOrgId))
      .paginate(args.paginationOpts);
  },
});

export const getWidgetStoragePage = internalQuery({
  args: {
    jobId: v.id("teamDeletionJobs"),
    paginationOpts: paginationOptsValidator,
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job) return null;
    return await ctx.db
      .query("webWidgetSettings")
      .withIndex("by_orgId", (q) => q.eq("orgId", job.workosOrgId))
      .paginate(args.paginationOpts);
  },
});

export const deleteStorageObjects = internalMutation({
  args: {
    storageIds: v.array(v.id("_storage")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    for (const storageId of args.storageIds) {
      await ctx.storage.delete(storageId);
    }
    return null;
  },
});
