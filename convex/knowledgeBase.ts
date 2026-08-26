import { v } from "convex/values";
import { mutation, query, internalMutation, internalQuery } from "./_generated/server";
import { internal, api } from "./_generated/api";
import { getAuthContext } from "./authUtils";
import { getPlan, getPlanFromStripe } from "./plans";
import type { Id } from "./_generated/dataModel";
import { assertAgentAccess } from "./agentUsage";
import { excludeConvertedWebLinks, hasParentWebUrl } from "../shared/webEntryUrl";
import { MediaUploadPurpose } from "../shared/mediaUploadPurpose";

type KnowledgeEntryTable = "textEntries" | "fileEntries" | "webEntries" | "qaEntries";

async function getKnowledgeBaseLimitForCurrentUser(
  ctx: Parameters<typeof getPlanFromStripe>[0],
) {
  const { userId } = await getAuthContext(ctx);
  const stripeInfo = await getPlanFromStripe(ctx, userId);
  return getPlan(stripeInfo.plan).knowledgeBaseBytesPerAgent;
}

async function getKnowledgeBaseBytesForAgent(
  ctx: Parameters<typeof getPlanFromStripe>[0],
  agentId: Id<"agents">,
  exclude?: { table: KnowledgeEntryTable; id: Id<KnowledgeEntryTable> },
) {
  const textEntries = await ctx.db
    .query("textEntries")
    .withIndex("by_agentId", (q) => q.eq("agentId", agentId))
    .take(500);
  const fileEntries = await ctx.db
    .query("fileEntries")
    .withIndex("by_agentId", (q) => q.eq("agentId", agentId))
    .take(500);
  const webEntries = await ctx.db
    .query("webEntries")
    .withIndex("by_agentId", (q) => q.eq("agentId", agentId))
    .take(500);
  const qaEntries = await ctx.db
    .query("qaEntries")
    .withIndex("by_agentId", (q) => q.eq("agentId", agentId))
    .take(500);
  const mediaUploads = await ctx.db
    .query("mediaUploads")
    .withIndex("by_agentId", (q) => q.eq("agentId", agentId))
    .take(500);

  const sumRows = <T extends { _id: string; fileSize?: number }>(
    table: KnowledgeEntryTable,
    rows: T[],
  ) =>
    rows.reduce((sum, row) => {
      if (exclude?.table === table && row._id === exclude.id) return sum;
      return sum + (row.fileSize ?? 0);
    }, 0);

  return (
    sumRows("textEntries", textEntries) +
    sumRows("fileEntries", fileEntries) +
    sumRows("webEntries", webEntries) +
    sumRows("qaEntries", qaEntries) +
    mediaUploads.reduce((sum, row) => {
      const countsTowardAgentStorage =
        row.purpose === MediaUploadPurpose.KnowledgeBase ||
        row.purpose === MediaUploadPurpose.WorkflowSendMedia;
      if (!countsTowardAgentStorage || row.status === "deleting" || row.status === "cancelled") {
        return sum;
      }
      return sum + (row.fileSize ?? 0);
    }, 0)
  );
}

async function assertKnowledgeBaseLimit(
  ctx: Parameters<typeof getPlanFromStripe>[0],
  agentId: Id<"agents">,
  incomingBytes: number,
  exclude?: { table: KnowledgeEntryTable; id: Id<KnowledgeEntryTable> },
) {
  const limit = await getKnowledgeBaseLimitForCurrentUser(ctx);
  const currentBytes = await getKnowledgeBaseBytesForAgent(ctx, agentId, exclude);
  if (currentBytes + incomingBytes > limit) {
    throw new Error(
      `Knowledge base limit reached. Your plan allows up to ${Math.round(limit / 1024).toLocaleString()} KB per agent.`,
    );
  }
}

// ─── Text Entries ──────────────────────────────────────────

export const listTextEntries = query({
  args: { agentId: v.id("agents") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("textEntries")
      .withIndex("by_agentId", (q) => q.eq("agentId", args.agentId))
      .order("desc")
      .collect();
  },
});

export const addTextEntry = mutation({
  args: {
    agentId: v.id("agents"),
    title: v.string(),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId, orgId } = await getAuthContext(ctx);
    const title = args.title.trim();
    const content = args.content.trim();
    if (!title || !content) throw new Error("Title and content are required");
    const fileSize = new Blob([title + content]).size;
    await assertKnowledgeBaseLimit(ctx, args.agentId, fileSize);
    return await ctx.db.insert("textEntries", {
      agentId: args.agentId,
      title,
      content,
      fileSize,
      userId,
      orgId,
      createdAt: Date.now(),
    });
  },
});

export const updateTextEntry = mutation({
  args: {
    entryId: v.id("textEntries"),
    title: v.string(),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const title = args.title.trim();
    const content = args.content.trim();
    if (!title || !content) throw new Error("Title and content are required");
    const fileSize = new Blob([title + content]).size;
    const existing = await ctx.db.get(args.entryId);
    if (!existing) throw new Error("Text entry not found");
    await assertKnowledgeBaseLimit(ctx, existing.agentId, fileSize, {
      table: "textEntries",
      id: args.entryId,
    });
    await ctx.db.patch(args.entryId, { title, content, fileSize });
  },
});

export const removeTextEntry = mutation({
  args: { entryId: v.id("textEntries") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.entryId);
  },
});

// ─── File Entries ──────────────────────────────────────────

export const listFileEntries = query({
  args: { agentId: v.id("agents") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("fileEntries")
      .withIndex("by_agentId", (q) => q.eq("agentId", args.agentId))
      .order("desc")
      .collect();
  },
});

export const addFileEntry = mutation({
  args: {
    agentId: v.id("agents"),
    title: v.optional(v.string()),
    fileName: v.string(),
    fileSize: v.number(),
  },
  handler: async (ctx, args) => {
    const { userId, orgId } = await getAuthContext(ctx);
    const fileName = args.fileName.trim();
    if (!fileName) throw new Error("File name is required");
    await assertKnowledgeBaseLimit(ctx, args.agentId, args.fileSize);
    return await ctx.db.insert("fileEntries", {
      agentId: args.agentId,
      title: args.title?.trim() || fileName,
      fileName: fileName,
      fileSize: args.fileSize,
      userId,
      orgId,
      createdAt: Date.now(),
    });
  },
});

export const updateFileEntry = mutation({
  args: {
    entryId: v.id("fileEntries"),
    title: v.optional(v.string()),
    fileName: v.string(),
  },
  handler: async (ctx, args) => {
    const fileName = args.fileName.trim();
    if (!fileName) throw new Error("File name is required");
    await ctx.db.patch(args.entryId, { title: args.title?.trim() || fileName, fileName });
  },
});

export const removeFileEntry = mutation({
  args: { entryId: v.id("fileEntries") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.entryId);
  },
});

// ─── Web Entries ───────────────────────────────────────────

export const listWebEntries = query({
  args: { agentId: v.id("agents") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("webEntries")
      .withIndex("by_agentId", (q) => q.eq("agentId", args.agentId))
      .order("desc")
      .collect();
  },
});

export const getWebEntryMarkdown = query({
  args: { entryId: v.id("webEntries") },
  handler: async (ctx, args) => {
    const entry = await ctx.db.get(args.entryId);
    if (entry === null) throw new Error("Web entry not found");
    await assertAgentAccess(ctx, entry.agentId);
    if (!entry.markdownStorageId) return null;
    const markdownUrl = await ctx.storage.getUrl(entry.markdownStorageId);
    if (markdownUrl === null) return null;
    return { markdownUrl };
  },
});

export const internalHasParentWebUrl = internalQuery({
  args: {
    agentId: v.id("agents"),
    url: v.string(),
  },
  handler: async (ctx, args) => {
    const entries = await ctx.db
      .query("webEntries")
      .withIndex("by_agentId", (q) => q.eq("agentId", args.agentId))
      .collect();
    return hasParentWebUrl(entries, args.url);
  },
});

export const addWebEntry = mutation({
  args: {
    agentId: v.id("agents"),
    url: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId, orgId } = await getAuthContext(ctx);
    const url = args.url.trim();
    if (!url) throw new Error("URL is required");
    const fileSize = new Blob([url]).size;
    await assertKnowledgeBaseLimit(ctx, args.agentId, fileSize);
    return await ctx.db.insert("webEntries", {
      agentId: args.agentId,
      url,
      fileSize,
      userId,
      orgId,
      createdAt: Date.now(),
    });
  },
});

export const updateWebEntry = mutation({
  args: {
    entryId: v.id("webEntries"),
    url: v.string(),
  },
  handler: async (ctx, args) => {
    const url = args.url.trim();
    if (!url) throw new Error("URL is required");
    const fileSize = new Blob([url]).size;
    const existing = await ctx.db.get(args.entryId);
    if (!existing) throw new Error("Web entry not found");
    await assertKnowledgeBaseLimit(ctx, existing.agentId, fileSize, {
      table: "webEntries",
      id: args.entryId,
    });
    await ctx.db.patch(args.entryId, { url, fileSize });
  },
});

export const removeWebEntry = mutation({
  args: { entryId: v.id("webEntries") },
  handler: async (ctx, args) => {
    const entry = await ctx.db.get(args.entryId);
    if (entry?.markdownStorageId) await ctx.storage.delete(entry.markdownStorageId);
    await ctx.db.delete(args.entryId);
  },
});

// ─── Q&A Entries ───────────────────────────────────────────

export const listQAEntries = query({
  args: { agentId: v.id("agents") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("qaEntries")
      .withIndex("by_agentId", (q) => q.eq("agentId", args.agentId))
      .order("desc")
      .collect();
  },
});

export const addQAEntry = mutation({
  args: {
    agentId: v.id("agents"),
    question: v.string(),
    answer: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId, orgId } = await getAuthContext(ctx);
    const question = args.question.trim();
    const answer = args.answer.trim();
    if (!question || !answer)
      throw new Error("Question and answer are required");
    const fileSize = new Blob([question + answer]).size;
    await assertKnowledgeBaseLimit(ctx, args.agentId, fileSize);
    return await ctx.db.insert("qaEntries", {
      agentId: args.agentId,
      question,
      answer,
      fileSize,
      userId,
      orgId,
      createdAt: Date.now(),
    });
  },
});

export const updateQAEntry = mutation({
  args: {
    entryId: v.id("qaEntries"),
    question: v.string(),
    answer: v.string(),
  },
  handler: async (ctx, args) => {
    const question = args.question.trim();
    const answer = args.answer.trim();
    if (!question || !answer)
      throw new Error("Question and answer are required");
    const fileSize = new Blob([question + answer]).size;
    const existing = await ctx.db.get(args.entryId);
    if (!existing) throw new Error("Q&A entry not found");
    await assertKnowledgeBaseLimit(ctx, existing.agentId, fileSize, {
      table: "qaEntries",
      id: args.entryId,
    });
    await ctx.db.patch(args.entryId, { question, answer, fileSize });
  },
});

export const removeQAEntry = mutation({
  args: { entryId: v.id("qaEntries") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.entryId);
  },
});

// ─── Internal Queries (no auth — called from actions) ─────

export const internalGetTextEntry = internalQuery({
  args: { entryId: v.id("textEntries") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.entryId);
  },
});

export const internalGetFileEntry = internalQuery({
  args: { entryId: v.id("fileEntries") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.entryId);
  },
});

export const internalGetWebEntry = internalQuery({
  args: { entryId: v.id("webEntries") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.entryId);
  },
});

export const internalGetWebEntriesByParentId = internalQuery({
  args: {
    parentId: v.id("webEntries"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("webEntries")
      .filter((q) => q.eq(q.field("parentId"), args.parentId))
      .collect();
  },
});

export const internalGetQAEntry = internalQuery({
  args: { entryId: v.id("qaEntries") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.entryId);
  },
});

export const internalGetAgentStorageUsed = internalQuery({
  args: { agentId: v.id("agents") },
  handler: async (ctx, args) => {
    const textEntries = await ctx.db
      .query("textEntries")
      .withIndex("by_agentId", (q) => q.eq("agentId", args.agentId))
      .collect();
    const fileEntries = await ctx.db
      .query("fileEntries")
      .withIndex("by_agentId", (q) => q.eq("agentId", args.agentId))
      .collect();
    const webEntries = await ctx.db
      .query("webEntries")
      .withIndex("by_agentId", (q) => q.eq("agentId", args.agentId))
      .collect();
    const qaEntries = await ctx.db
      .query("qaEntries")
      .withIndex("by_agentId", (q) => q.eq("agentId", args.agentId))
      .collect();

    const total =
      textEntries.reduce((sum, e) => sum + (e.fileSize ?? 0), 0) +
      fileEntries.reduce((sum, e) => sum + (e.fileSize ?? 0), 0) +
      webEntries.reduce((sum, e) => sum + (e.fileSize ?? 0), 0) +
      qaEntries.reduce((sum, e) => sum + (e.fileSize ?? 0), 0);

    return total;
  },
});

export const getStorageLimit = query({
  args: {},
  handler: async (ctx) => {
    const maxTotalSize = await getKnowledgeBaseLimitForCurrentUser(ctx);
    return { maxFileSize: maxTotalSize, maxTotalSize };
  },
});

export const internalGetKnowledgeBaseBytesForAgent = internalQuery({
  args: { agentId: v.id("agents") },
  handler: async (ctx, args) => {
    return await getKnowledgeBaseBytesForAgent(ctx, args.agentId);
  },
});

// ─── Internal Mutations (no auth — called from actions) ─────

export const internalStoreTextEntry = internalMutation({
  args: {
    agentId: v.id("agents"),
    title: v.string(),
    content: v.string(),
    fileSize: v.number(),
    cfItemId: v.optional(v.string()),
    userId: v.string(),
    orgId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("textEntries", {
      agentId: args.agentId,
      title: args.title,
      content: args.content,
      fileSize: args.fileSize,
      cfItemId: args.cfItemId,
      userId: args.userId,
      orgId: args.orgId,
      createdAt: Date.now(),
    });
  },
});

export const internalPatchTextEntry = internalMutation({
  args: {
    entryId: v.id("textEntries"),
    title: v.string(),
    content: v.string(),
    fileSize: v.number(),
    cfItemId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.entryId, {
      title: args.title,
      content: args.content,
      fileSize: args.fileSize,
      cfItemId: args.cfItemId,
    });
  },
});

export const internalRemoveTextEntry = internalMutation({
  args: { entryId: v.id("textEntries") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.entryId);
  },
});

export const internalStoreFileEntry = internalMutation({
  args: {
    agentId: v.id("agents"),
    title: v.optional(v.string()),
    fileName: v.string(),
    fileSize: v.number(),
    cfItemId: v.optional(v.string()),
    userId: v.string(),
    orgId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("fileEntries", {
      agentId: args.agentId,
      title: args.title?.trim() || args.fileName,
      fileName: args.fileName,
      fileSize: args.fileSize,
      cfItemId: args.cfItemId,
      userId: args.userId,
      orgId: args.orgId,
      createdAt: Date.now(),
    });
  },
});

export const internalPatchFileEntry = internalMutation({
  args: {
    entryId: v.id("fileEntries"),
    title: v.optional(v.string()),
    fileName: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.entryId, { title: args.title?.trim() || args.fileName, fileName: args.fileName });
  },
});

export const internalRemoveFileEntry = internalMutation({
  args: { entryId: v.id("fileEntries") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.entryId);
  },
});

export const internalStoreWebEntry = internalMutation({
  args: {
    agentId: v.id("agents"),
    url: v.string(),
    fileSize: v.number(),
    cfItemId: v.optional(v.string()),
    parentUrl: v.optional(v.string()),
    parentId: v.optional(v.id("webEntries")),
    userId: v.string(),
    orgId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("webEntries", {
      agentId: args.agentId,
      url: args.url,
      fileSize: args.fileSize,
      cfItemId: args.cfItemId,
      parentUrl: args.parentUrl,
      parentId: args.parentId,
      userId: args.userId,
      orgId: args.orgId,
      createdAt: Date.now(),
    });
  },
});

export const internalStoreWebEntryWithContent = internalMutation({
  args: {
    agentId: v.id("agents"),
    url: v.string(),
    fileSize: v.number(),
    markdownStorageId: v.id("_storage"),
    cfItemId: v.optional(v.string()),
    parentUrl: v.optional(v.string()),
    userId: v.string(),
    orgId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("webEntries", {
      agentId: args.agentId,
      url: args.url,
      fileSize: args.fileSize,
      cfItemId: args.cfItemId,
      markdownStorageId: args.markdownStorageId,
      parentUrl: args.parentUrl,
      userId: args.userId,
      orgId: args.orgId,
      createdAt: Date.now(),
    });
  },
});

export const internalPatchWebEntry = internalMutation({
  args: {
    entryId: v.id("webEntries"),
    url: v.string(),
    fileSize: v.number(),
    cfItemId: v.optional(v.string()),
    parentUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.entryId, {
      url: args.url,
      fileSize: args.fileSize,
      cfItemId: args.cfItemId,
      parentUrl: args.parentUrl,
    });
  },
});

export const internalRemoveWebEntry = internalMutation({
  args: { entryId: v.id("webEntries") },
  handler: async (ctx, args) => {
    const entry = await ctx.db.get(args.entryId);
    if (entry?.markdownStorageId) await ctx.storage.delete(entry.markdownStorageId);
    await ctx.db.delete(args.entryId);
  },
});

export const internalStoreQAEntry = internalMutation({
  args: {
    agentId: v.id("agents"),
    question: v.string(),
    answer: v.string(),
    fileSize: v.number(),
    cfItemId: v.optional(v.string()),
    userId: v.string(),
    orgId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("qaEntries", {
      agentId: args.agentId,
      question: args.question,
      answer: args.answer,
      fileSize: args.fileSize,
      cfItemId: args.cfItemId,
      userId: args.userId,
      orgId: args.orgId,
      createdAt: Date.now(),
    });
  },
});

export const internalPatchQAEntry = internalMutation({
  args: {
    entryId: v.id("qaEntries"),
    question: v.string(),
    answer: v.string(),
    fileSize: v.number(),
    cfItemId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.entryId, {
      question: args.question,
      answer: args.answer,
      fileSize: args.fileSize,
      cfItemId: args.cfItemId,
    });
  },
});

export const internalRemoveQAEntry = internalMutation({
  args: { entryId: v.id("qaEntries") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.entryId);
  },
});

// ─── Status management ────────────────────────────────────

export const internalSetStatus = internalMutation({
  args: {
    entryId: v.union(
      v.id("textEntries"),
      v.id("fileEntries"),
      v.id("webEntries"),
      v.id("qaEntries"),
    ),
    status: v.union(
      v.literal("queued"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed"),
      v.literal("deleting"),
      v.literal("gettingLinks"),
      v.literal("linksObtained"),
      v.literal("gettingMarkdown"),
    ),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.entryId, { status: args.status });
  },
});

export const internalCompleteTextEntry = internalMutation({
  args: {
    entryId: v.id("textEntries"),
    cfItemId: v.string(),
    fileSize: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.entryId, {
      status: "completed",
      cfItemId: args.cfItemId,
      fileSize: args.fileSize,
    });
  },
});

export const internalCompleteFileEntry = internalMutation({
  args: {
    entryId: v.id("fileEntries"),
    cfItemId: v.string(),
    fileSize: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.entryId, {
      status: "completed",
      cfItemId: args.cfItemId,
      fileSize: args.fileSize,
    });
  },
});

export const internalCompleteWebEntry = internalMutation({
  args: {
    entryId: v.id("webEntries"),
    cfItemId: v.string(),
    fileSize: v.number(),
    markdownStorageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const entry = await ctx.db.get(args.entryId);
    if (entry === null) throw new Error("Web entry not found");
    await ctx.db.patch(args.entryId, {
      status: "completed",
      cfItemId: args.cfItemId,
      fileSize: args.fileSize,
      markdownStorageId: entry.markdownStorageId ?? args.markdownStorageId,
    });
  },
});

export const internalCompleteQAEntry = internalMutation({
  args: {
    entryId: v.id("qaEntries"),
    cfItemId: v.string(),
    fileSize: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.entryId, {
      status: "completed",
      cfItemId: args.cfItemId,
      fileSize: args.fileSize,
    });
  },
});

// ─── Workpool onComplete handlers ─────────────────────────

export const cfUploadComplete = internalMutation({
  args: {
    workId: v.string(),
    context: v.object({
      entryId: v.string(),
      entryType: v.union(
        v.literal("text"),
        v.literal("file"),
        v.literal("qa"),
      ),
    }),
    result: v.union(
      v.object({ kind: v.literal("success"), returnValue: v.any() }),
      v.object({ kind: v.literal("failed"), error: v.string() }),
      v.object({ kind: v.literal("canceled") }),
    ),
  },
  handler: async (ctx, args) => {
    const { entryId, entryType } = args.context;

    if (args.result.kind === "success" && args.result.returnValue) {
      const { cfItemId, fileSize } = args.result.returnValue as { cfItemId: string; fileSize: number };
      switch (entryType) {
        case "text":
          await ctx.runMutation(internal.knowledgeBase.internalCompleteTextEntry, {
            entryId: entryId as never, cfItemId, fileSize,
          });
          break;
        case "file":
          await ctx.runMutation(internal.knowledgeBase.internalCompleteFileEntry, {
            entryId: entryId as never, cfItemId, fileSize,
          });
          break;
        case "qa":
          await ctx.runMutation(internal.knowledgeBase.internalCompleteQAEntry, {
            entryId: entryId as never, cfItemId, fileSize,
          });
          break;
      }
    } else {
      await ctx.runMutation(internal.knowledgeBase.internalSetStatus, {
        entryId: entryId as never,
        status: "failed",
      });
    }
  },
});

export const cfDeleteComplete = internalMutation({
  args: {
    workId: v.string(),
    context: v.object({
      entryId: v.string(),
      entryType: v.union(
        v.literal("text"),
        v.literal("file"),
        v.literal("web"),
        v.literal("qa"),
      ),
    }),
    result: v.union(
      v.object({ kind: v.literal("success"), returnValue: v.any() }),
      v.object({ kind: v.literal("failed"), error: v.string() }),
      v.object({ kind: v.literal("canceled") }),
    ),
  },
  handler: async (ctx, args) => {
    const { entryId, entryType } = args.context;

    if (args.result.kind !== "canceled") {
      switch (entryType) {
        case "text":
          await ctx.runMutation(internal.knowledgeBase.internalRemoveTextEntry, {
            entryId: entryId as never,
          });
          break;
        case "file":
          await ctx.runMutation(internal.knowledgeBase.internalRemoveFileEntry, {
            entryId: entryId as never,
          });
          break;
        case "web":
          await ctx.runMutation(internal.knowledgeBase.internalRemoveWebEntry, {
            entryId: entryId as never,
          });
          break;
        case "qa":
          await ctx.runMutation(internal.knowledgeBase.internalRemoveQAEntry, {
            entryId: entryId as never,
          });
          break;
      }
    }
  },
});

export const webScraperComplete = internalMutation({
  args: {
    workId: v.string(),
    context: v.object({
      entryId: v.string(),
    }),
    result: v.union(
      v.object({ kind: v.literal("success"), returnValue: v.any() }),
      v.object({ kind: v.literal("failed"), error: v.string() }),
      v.object({ kind: v.literal("canceled") }),
    ),
  },
  handler: async (ctx, args) => {
    const { entryId } = args.context;

    if (args.result.kind === "success" && args.result.returnValue) {
      const { cfItemId, fileSize, markdownStorageId } = args.result.returnValue as {
        cfItemId: string;
        fileSize: number;
        markdownStorageId: Id<"_storage">;
      };
      await ctx.runMutation(internal.knowledgeBase.internalCompleteWebEntry, {
        entryId: entryId as never, cfItemId, fileSize, markdownStorageId,
      });

      // Check if all siblings are completed, and if so, mark parent as completed
      const entry = await ctx.db.query("webEntries").filter((q) => q.eq(q.field("_id"), entryId)).first();
      if (entry && entry.parentId) {
        const siblings = await ctx.db.query("webEntries")
          .withIndex("by_agentId", (q) => q.eq("agentId", entry.agentId))
          .filter((q) => q.eq(q.field("parentUrl"), entry.parentUrl))
          .collect();
        const allDone = siblings.every((s) => s.status === "completed");
        if (allDone) {
          await ctx.db.patch(entry.parentId, { status: "completed" });
        }
      }
    } else {
      await ctx.runMutation(internal.knowledgeBase.internalSetStatus, {
        entryId: entryId as never,
        status: "failed",
      });
    }
  },
});

export const linkDiscovererComplete = internalMutation({
  args: {
    workId: v.string(),
    context: v.object({
      entryId: v.string(),
      agentId: v.string(),
      parentUrl: v.string(),
      userId: v.string(),
      orgId: v.string(),
    }),
    result: v.union(
      v.object({ kind: v.literal("success"), returnValue: v.any() }),
      v.object({ kind: v.literal("failed"), error: v.string() }),
      v.object({ kind: v.literal("canceled") }),
    ),
  },
  handler: async (ctx, args) => {
    const { entryId, agentId, parentUrl, userId, orgId } = args.context;

    if (args.result.kind === "success" && args.result.returnValue) {
      const { links } = args.result.returnValue as { links: string[]; sourceUrl: string };
      const existingEntries = await ctx.db
      .query("webEntries")
      .withIndex("by_agentId", (q) => q.eq("agentId", agentId as never))
      .collect();
      const pendingLinks = excludeConvertedWebLinks(links, existingEntries);

      if (pendingLinks.length === 0) {
        await ctx.db.delete(entryId as never);
        return;
      }

      // Mark parent as processing while children are being scraped
      await ctx.db.patch(entryId as never, { status: "gettingMarkdown" });

      // Schedule enqueueWebScrape for each link — it handles DB insertion + workpool enqueueing
      for (const link of pendingLinks) {
        await ctx.scheduler.runAfter(0, api.cloudflare.enqueueWebScrape, {
          agentId: agentId as never,
          url: link,
          parentUrl,
          parentId: entryId as never,
          userId,
          orgId,
        });
      }
    } else {
      // On failure or cancel, mark parent as failed
      await ctx.db.patch(entryId as never, { status: "failed" });
    }
  },
});
