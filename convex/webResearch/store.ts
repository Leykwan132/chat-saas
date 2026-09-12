import { v } from "convex/values";
import { internalMutation, internalQuery } from "../_generated/server";

export const markEmbedding = internalMutation({
  args: {
    entryId: v.id("webEntries"),
    markdownR2Key: v.string(),
    fileSize: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.entryId, {
      status: "gettingMarkdown",
      markdownR2Key: args.markdownR2Key,
      fileSize: args.fileSize,
    });
    return null;
  },
});

export const readStoredMarkdownUrl = internalQuery({
  args: { entryId: v.id("webEntries") },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, args) => {
    const entry = await ctx.db.get(args.entryId);
    if (!entry?.markdownStorageId) return null;
    return await ctx.storage.getUrl(entry.markdownStorageId);
  },
});
