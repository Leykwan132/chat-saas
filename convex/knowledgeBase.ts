import { v } from "convex/values";
import { mutation, query, internalMutation, internalQuery } from "./_generated/server";
import { getAuthContext } from "./authUtils";

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
    await ctx.db.patch(args.entryId, { url, fileSize });
  },
});

export const removeWebEntry = mutation({
  args: { entryId: v.id("webEntries") },
  handler: async (ctx, args) => {
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
  handler: async (_ctx, _args) => {
    return { maxFileSize: 4 * 1024 * 1024, maxTotalSize: 4 * 1024 * 1024 };
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
    markdown: v.string(),
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
