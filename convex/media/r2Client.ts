import { v } from "convex/values";
import { action, internalMutation, mutation } from "../_generated/server";
import { internal } from "../_generated/api";
import { getAuthContext } from "../authUtils";
import { r2, generateInboxMediaKey } from "./r2";
import { mediaDeletePool } from "../mediaPools";
import { Id } from "../_generated/dataModel";

/** Signed URL + org-scoped key for client-side PUT (used with `useUploadFile` pattern). */
export const generateUploadUrl = mutation({
  args: {
    clientId: v.string(),
    mediaType: v.string(),
    filename: v.optional(v.string()),
  },
  returns: v.object({
    key: v.string(),
    url: v.string(),
  }),
  handler: async (ctx, args) => {
    const auth = await getAuthContext(ctx);
    if (!args.mediaType.startsWith("image/")) {
      throw new Error("Only image uploads are supported");
    }

    await ctx.runMutation(internal.media.attachments.internalCreateUpload, {
      clientId: args.clientId,
      orgId: auth.orgId,
      userId: auth.userId,
      mediaType: args.mediaType,
      filename: args.filename,
    });

    const key = generateInboxMediaKey(auth.orgId, args.mediaType);
    return await r2.generateUploadUrl(key);
  },
});

/**
 * Internal mutation: look up the mediaUploads row and apply the post-sync
 * state transition. Returns the row's status so the action can decide
 * whether to schedule a delete.
 */
export const internalFinalizeSyncMetadata = internalMutation({
  args: {
    orgId: v.string(),
    userId: v.string(),
    clientId: v.string(),
    key: v.string(),
  },
  returns: v.union(
    v.object({ outcome: v.literal("notFound") }),
    v.object({ outcome: v.literal("cancelled"), uploadId: v.id("mediaUploads") }),
    v.object({ outcome: v.literal("ready") }),
  ),
  handler: async (ctx, args): Promise<
    | { outcome: "notFound" }
    | { outcome: "cancelled"; uploadId: Id<"mediaUploads"> }
    | { outcome: "ready" }
  > => {
    const row = await ctx.db
      .query("mediaUploads")
      .withIndex("by_orgId_userId_clientId", (q) =>
        q
          .eq("orgId", args.orgId)
          .eq("userId", args.userId)
          .eq("clientId", args.clientId),
      )
      .unique();

    if (row === null) {
      return { outcome: "notFound" };
    }

    if (row.status === "cancelled") {
      // Keep the row alive so the workpool onComplete callback can delete it.
      await ctx.db.patch(row._id, { status: "deleting" });
      return { outcome: "cancelled", uploadId: row._id };
    }

    await ctx.db.patch(row._id, {
      status: "ready",
      r2Key: args.key,
    });
    return { outcome: "ready" };
  },
});

/** After client PUT, sync R2 metadata and mark the attachment row ready. */
export const syncMetadata = action({
  args: {
    key: v.string(),
    clientId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const auth = await getAuthContext(ctx);

    // Sync object metadata from R2 into the Convex component table.
    await r2.syncMetadata(ctx, args.key);

    // Finalize the DB row and get the outcome.
    const result = await ctx.runMutation(
      internal.media.r2Client.internalFinalizeSyncMetadata,
      {
        orgId: auth.orgId,
        userId: auth.userId,
        clientId: args.clientId,
        key: args.key,
      },
    );

    // If the row was missing or the upload was cancelled, enqueue an R2 delete
    // via the workpool so it gets retried on transient failures.
    if (result.outcome === "notFound") {
      // No DB row to track — fire-and-forget via workpool (no onComplete needed).
      await mediaDeletePool.enqueueAction(
        ctx,
        internal.workpool.mediaDeleteWorker,
        { r2Key: args.key },
        { retry: true },
      );
    } else if (result.outcome === "cancelled") {
      // Row was transitioned to "deleting"; clean it up after successful delete.
      await mediaDeletePool.enqueueAction(
        ctx,
        internal.workpool.mediaDeleteWorker,
        { r2Key: args.key },
        {
          onComplete: internal.media.attachments.mediaDeleteComplete,
          context: { uploadId: result.uploadId },
          retry: true,
        },
      );
    }

    return null;
  },
});
