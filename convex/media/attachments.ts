import { v } from "convex/values";
import {
  action,
  internalMutation,
  mutation,
  query,
} from "../_generated/server";
import { internal } from "../_generated/api";
import { getAuthContext } from "../authUtils";
import { mediaDeletePool } from "../mediaPools";
import { getPublicMediaUrl } from "./r2";

export const enqueueDelete = action({
  args: {
    clientId: v.string(),
  },
  handler: async (ctx, args): Promise<void> => {
    const auth = await getAuthContext(ctx);
    const row = await ctx.runMutation(
      internal.media.attachments.internalMarkDeleting,
      {
        clientId: args.clientId,
        orgId: auth.orgId,
        userId: auth.userId,
      },
    );
    if (row === null || !row.r2Key) {
      return;
    }

    await mediaDeletePool.enqueueAction(
      ctx,
      internal.workpool.mediaDeleteWorker,
      { r2Key: row.r2Key },
      {
        onComplete: internal.media.attachments.mediaDeleteComplete,
        context: { uploadId: row._id },
        retry: true,
      },
    );
  },
});

export const cancelUpload = mutation({
  args: {
    clientId: v.string(),
  },
  handler: async (ctx, args): Promise<void> => {
    const auth = await getAuthContext(ctx);
    const row = await ctx.db
      .query("mediaUploads")
      .withIndex("by_orgId_userId_clientId", (q) =>
        q
          .eq("orgId", auth.orgId)
          .eq("userId", auth.userId)
          .eq("clientId", args.clientId),
      )
      .unique();

    if (row === null) return;
    if (row.status === "deleting") return;

    if (row.r2Key) {
      await ctx.db.patch(row._id, { status: "cancelled" });
      return;
    }

    await ctx.db.delete(row._id);
  },
});

export const markUploadFailed = mutation({
  args: {
    clientId: v.string(),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<void> => {
    const auth = await getAuthContext(ctx);
    const row = await ctx.db
      .query("mediaUploads")
      .withIndex("by_orgId_userId_clientId", (q) =>
        q
          .eq("orgId", auth.orgId)
          .eq("userId", auth.userId)
          .eq("clientId", args.clientId),
      )
      .unique();

    if (row === null || row.status === "cancelled" || row.status === "deleting") {
      return;
    }

    await ctx.db.patch(row._id, {
      status: "failed",
      error: args.error ?? "Upload failed",
    });
  },
});

export const getUploadsByClientIds = query({
  args: {
    clientIds: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const auth = await getAuthContext(ctx);
    const results: Array<{
      clientId: string;
      status: string;
      r2Key?: string;
      error?: string;
    }> = [];

    for (const clientId of args.clientIds) {
      const row = await ctx.db
        .query("mediaUploads")
        .withIndex("by_orgId_userId_clientId", (q) =>
          q
            .eq("orgId", auth.orgId)
            .eq("userId", auth.userId)
            .eq("clientId", clientId),
        )
        .unique();

      if (row === null) continue;
      results.push({
        clientId,
        status: row.status,
        r2Key: row.r2Key,
        error: row.error,
      });
    }

    return results;
  },
});

export const internalCreateUpload = internalMutation({
  args: {
    clientId: v.string(),
    orgId: v.string(),
    userId: v.string(),
    mediaType: v.string(),
    filename: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("mediaUploads")
      .withIndex("by_orgId_userId_clientId", (q) =>
        q
          .eq("orgId", args.orgId)
          .eq("userId", args.userId)
          .eq("clientId", args.clientId),
      )
      .unique();

    if (existing !== null) {
      if (
        existing.status === "ready" ||
        existing.status === "uploading" ||
        existing.status === "queued"
      ) {
        return existing._id;
      }
      await ctx.db.delete(existing._id);
    }

    return await ctx.db.insert("mediaUploads", {
      clientId: args.clientId,
      orgId: args.orgId,
      userId: args.userId,
      status: "uploading",
      mediaType: args.mediaType,
      filename: args.filename,
      createdAt: Date.now(),
    });
  },
});

export const internalMarkDeleting = internalMutation({
  args: {
    clientId: v.string(),
    orgId: v.string(),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("mediaUploads")
      .withIndex("by_orgId_userId_clientId", (q) =>
        q
          .eq("orgId", args.orgId)
          .eq("userId", args.userId)
          .eq("clientId", args.clientId),
      )
      .unique();

    if (row === null) return null;
    if (row.status === "deleting" || row.status === "cancelled") {
      return row;
    }

    if (!row.r2Key) {
      await ctx.db.delete(row._id);
      return null;
    }

    await ctx.db.patch(row._id, { status: "deleting" });
    return { ...row, status: "deleting" as const };
  },
});

export const internalGetReadyUploads = internalMutation({
  args: {
    clientIds: v.array(v.string()),
    orgId: v.string(),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const uploads: Array<{
      clientId: string;
      publicUrl: string;
      mediaType: string;
    }> = [];

    for (const clientId of args.clientIds) {
      const row = await ctx.db
        .query("mediaUploads")
        .withIndex("by_orgId_userId_clientId", (q) =>
          q
            .eq("orgId", args.orgId)
            .eq("userId", args.userId)
            .eq("clientId", clientId),
        )
        .unique();

      if (row === null || row.status !== "ready" || !row.r2Key) {
        throw new Error(`Attachment ${clientId} is not ready for send`);
      }

      uploads.push({
        clientId,
        publicUrl: getPublicMediaUrl(row.r2Key),
        mediaType: row.mediaType,
      });
    }

    return uploads;
  },
});

export const mediaDeleteComplete = internalMutation({
  args: {
    workId: v.string(),
    context: v.object({ uploadId: v.id("mediaUploads") }),
    result: v.union(
      v.object({ kind: v.literal("success"), returnValue: v.any() }),
      v.object({ kind: v.literal("failed"), error: v.string() }),
      v.object({ kind: v.literal("canceled") }),
    ),
  },
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.context.uploadId);
    if (row !== null) {
      await ctx.db.delete(row._id);
    }
  },
});
